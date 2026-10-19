import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase } from "./db.js";
import { backfillDates, createIngestionService, fetchPayload, parsePayload } from "./ingestion.js";

const now = () => new Date("2026-10-20T00:10:00.000Z");
const payload = (metric = "psi", values = { north: 31, south: 32, east: 33, west: 34, central: 35 }) => ({
  code: 0,
  data: {
    items: [{
      timestamp: "2026-10-20T00:00:00+08:00",
      updatedTimestamp: "2026-10-20T00:05:00+08:00",
      readings: { [metric === "psi" ? "psi_twenty_four_hourly" : "pm25_one_hourly"]: values },
    }],
  },
});
const response = value => ({ ok: true, status: 200, json: async () => value });

function assertSlidingWindowLimit(timestamps, limit, windowMs) {
  for (const start of timestamps) {
    const count = timestamps.filter(timestamp => timestamp >= start && timestamp < start + windowMs).length;
    assert.ok(count <= limit, `${count} requests started within the window at ${start}ms`);
  }
}

test("normalizes PSI and PM2.5 while preserving source times and missing regional values", () => {
  const psi = parsePayload(payload("psi", { north: 31, central: 35 }), "psi", "2026-10-20T00:10:00.000Z");
  const pm25 = parsePayload(payload("pm25", { south: 8 }), "pm25", "2026-10-20T00:10:00.000Z");
  assert.equal(psi.length, 2);
  assert.equal(psi[0].observedAt, "2026-10-19T16:00:00.000Z");
  assert.equal(psi[0].sourceUpdatedAt, "2026-10-19T16:05:00.000Z");
  assert.equal(psi[0].fetchedAt, "2026-10-20T00:10:00.000Z");
  assert.deepEqual(pm25.map(row => [row.metric, row.region, row.value]), [["pm25", "south", 8]]);
  assert.throws(() => parsePayload({ code: 0, data: {} }, "psi"), /data.items/);
});

test("builds a 30-calendar-day backfill window using Singapore dates", () => {
  assert.deepEqual(backfillDates(new Date("2026-10-19T16:30:00.000Z"), 3), ["2026-10-20", "2026-10-19", "2026-10-18"]);
  assert.equal(backfillDates(new Date("2026-10-19T16:30:00.000Z")).length, 30);
});

test("paces combined historical requests at the compliant two-second default", async () => {
  const database = openDatabase(":memory:");
  const waits = [];
  let requests = 0;
  const service = createIngestionService({
    database, now, sleep: async ms => waits.push(ms), attempts: 1,
    fetchImpl: async url => {
      requests += 1;
      return response(payload(String(url).includes("pm25") ? "pm25" : "psi"));
    },
  });
  try {
    await service.importHistory({ dates: ["2026-10-19", "2026-10-20"] });
    assert.equal(requests, 4);
    assert.deepEqual(waits, [2_000, 2_000, 2_000]);
  } finally {
    database.close();
  }
});

test("startup polling and immediate backfill share the six-per-ten-second provider limit", async () => {
  const database = openDatabase(":memory:");
  let clock = 0;
  const requestTimes = [];
  const service = createIngestionService({
    database,
    now,
    requestNow: () => clock,
    sleep: async ms => { clock += ms; },
    backfillDelayMs: 0,
    pollIntervalMs: 60_000,
    attempts: 1,
    fetchImpl: async url => {
      requestTimes.push(clock);
      return response(payload(String(url).includes("pm25") ? "pm25" : "psi"));
    },
  });
  try {
    await service.start();
    await service.stop();
    assert.equal(requestTimes.length, 62, "two current-feed requests plus 30 dates for two metrics");
    assert.deepEqual(requestTimes.slice(0, 6), [0, 0, 0, 0, 0, 0]);
    assert.ok(requestTimes.includes(10_000), "the seventh request waits for the first window to expire");
    assertSlidingWindowLimit(requestTimes, 6, 10_000);
  } finally {
    await service.stop();
    database.close();
  }
});

test("retry attempts use the same limiter as other feed requests", async () => {
  const database = openDatabase(":memory:");
  let clock = 0;
  const requestTimes = [];
  let failing = false;
  const service = createIngestionService({
    database,
    now,
    requestNow: () => clock,
    sleep: async ms => { clock += ms; },
    backfillDelayMs: 0,
    attempts: 3,
    fetchImpl: async url => {
      requestTimes.push(clock);
      if (failing) return { ok: false, status: 429, headers: { get: () => "0" } };
      return response(payload(String(url).includes("pm25") ? "pm25" : "psi"));
    },
  });
  try {
    for (let index = 0; index < 5; index += 1) {
      await service.ingest(index % 2 ? "pm25" : "psi", "current");
    }
    failing = true;
    await assert.rejects(service.ingest("psi", "current"), /HTTP 429/);
    assert.deepEqual(requestTimes.slice(0, 6), [0, 0, 0, 0, 0, 0]);
    assert.deepEqual(requestTimes.slice(6), [10_000, 10_000]);
    assertSlidingWindowLimit(requestTimes, 6, 10_000);
  } finally {
    await service.stop();
    database.close();
  }
});

test("retries timeout, HTTP errors, 429, and malformed payloads within a fixed attempt bound", async () => {
  const waits = [];
  let calls = 0;
  await assert.rejects(fetchPayload("https://example.test", {
    fetchImpl: async () => { calls += 1; throw new Error("timeout"); },
    sleep: async ms => waits.push(ms),
  }), /timeout/);
  assert.equal(calls, 3);
  assert.deepEqual(waits, [500, 1000]);

  calls = 0;
  waits.length = 0;
  await assert.rejects(fetchPayload("https://example.test", {
    fetchImpl: async () => { calls += 1; return { ok: false, status: 429, headers: { get: () => "0.25" } }; },
    sleep: async ms => waits.push(ms),
  }), /HTTP 429/);
  assert.equal(calls, 3);
  assert.deepEqual(waits, [250, 250]);

  calls = 0;
  await assert.rejects(fetchPayload("https://example.test", {
    fetchImpl: async () => { calls += 1; return response({ code: 0, data: {} }); },
    sleep: async () => {},
    validatePayload: value => parsePayload(value, "psi"),
  }), /data.items/);
  assert.equal(calls, 3);

  calls = 0;
  await assert.rejects(fetchPayload("https://example.test", {
    fetchImpl: async () => { calls += 1; return { ok: false, status: 503 }; },
    sleep: async () => {},
  }), /HTTP 503/);
  assert.equal(calls, 3);
});

test("polling twice upserts observations and provider failure preserves existing rows", async () => {
  const database = openDatabase(":memory:");
  let shouldFail = false;
  const service = createIngestionService({
    database, now, sleep: async () => {}, attempts: 1,
    fetchImpl: async url => {
      if (shouldFail && String(url).includes("pm25")) throw new Error("provider offline");
      return response(payload(String(url).includes("pm25") ? "pm25" : "psi"));
    },
  });
  try {
    await service.pollCurrent();
    await service.pollCurrent();
    assert.equal(database.prepare("SELECT count(*) AS count FROM observations").get().count, 10);
    shouldFail = true;
    await assert.rejects(service.pollCurrent(), /current air-quality feed\(s\) failed/);
    assert.equal(database.prepare("SELECT count(*) AS count FROM observations").get().count, 10);
    assert.equal(database.prepare("SELECT count(*) AS count FROM ingestion_runs WHERE status = 'failed'").get().count, 1);
    assert.equal(database.prepare("SELECT count(*) AS count FROM ingestion_runs WHERE status = 'succeeded'").get().count, 5);
  } finally {
    await service.stop();
    database.close();
  }
});

test("stop waits for an in-flight poll before the database is closed", async () => {
  const database = openDatabase(":memory:");
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const service = createIngestionService({
    database, now, attempts: 1,
    fetchImpl: async url => {
      await gate;
      return response(payload(String(url).includes("pm25") ? "pm25" : "psi"));
    },
  });
  try {
    const poll = service.pollCurrent();
    const stopping = service.stop();
    release();
    await poll;
    await stopping;
    assert.equal(database.prepare("SELECT count(*) AS count FROM observations").get().count, 10);
  } finally {
    await service.stop();
    database.close();
  }
});

test("date backfill resumes from durable metric/date successes after restart", async () => {
  const database = openDatabase(":memory:");
  let failFirstPm25Date = true;
  const requested = [];
  const makeService = () => createIngestionService({
    database, now, backfillDelayMs: 0, sleep: async () => {}, attempts: 1,
    fetchImpl: async url => {
      const parsed = new URL(url);
      const metric = parsed.pathname.endsWith("pm25") ? "pm25" : "psi";
      const date = parsed.searchParams.get("date");
      requested.push(`${metric}:${date}`);
      if (metric === "pm25" && date === "2026-10-19" && failFirstPm25Date) {
        failFirstPm25Date = false;
        throw new Error("temporary provider failure");
      }
      return response(payload(metric));
    },
  });
  try {
    const first = await makeService().importHistory({ dates: ["2026-10-19", "2026-10-20"] });
    assert.equal(first.errors.length, 1);
    const afterFirst = requested.length;
    const second = await makeService().importHistory({ dates: ["2026-10-19", "2026-10-20"] });
    assert.equal(second.errors.length, 0);
    assert.equal(requested.length - afterFirst, 1);
    assert.equal(requested.at(-1), "pm25:2026-10-19");
    assert.equal(database.prepare("SELECT count(*) AS count FROM observations").get().count, 10);
    assert.equal(database.prepare("SELECT count(*) AS count FROM ingestion_runs WHERE run_type = 'backfill' AND status = 'succeeded'").get().count, 4);
  } finally {
    database.close();
  }
});
