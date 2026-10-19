import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiHandler } from "./api.js";
import { openDatabase } from "./db.js";
import { renderDashboardWithApiHandler } from "./dashboard-ui-harness.js";
import { createIngestionService } from "./ingestion.js";

const observedAt = "2026-10-20T00:00:00+08:00";
const updatedAt = "2026-10-20T00:05:00+08:00";
const readings = { north: 31, south: 32, east: 33, west: 34, central: 35 };
const payload = metric => ({
  code: 0,
  data: { items: [{
    timestamp: observedAt,
    updatedTimestamp: updatedAt,
    readings: { [metric === "psi" ? "psi_twenty_four_hourly" : "pm25_one_hourly"]: readings },
  }] },
});

function callApi(handler, url, method = "GET") {
  let status;
  let body;
  handler({ url, method }, {
    writeHead(value) { status = value; },
    end(value) { body = value; },
  });
  return { status, body: JSON.parse(body) };
}

async function waitForPolls(database, minimum, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const counts = database.prepare(`
      SELECT metric, count(*) AS count FROM ingestion_runs
      WHERE run_type = 'current' AND status = 'succeeded' GROUP BY metric
    `).all();
    if (counts.length === 2 && counts.every(row => row.count >= minimum)) return counts;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for ${minimum} successful current polls per metric`);
}

async function withFreshDatabase(run) {
  const directory = await mkdtemp(join(tmpdir(), "air-quality-integration-"));
  const databasePath = join(directory, "fresh.sqlite");
  const database = openDatabase(databasePath);
  const service = createIngestionService({
    database,
    attempts: 1,
    backfillDelayMs: 0,
    pollIntervalMs: 25,
    providerRequestLimit: 1_000,
    now: () => new Date("2026-10-19T16:10:00.000Z"),
    fetchImpl: async url => {
      const metric = String(url).includes("pm25") ? "pm25" : "psi";
      return { ok: true, status: 200, json: async () => payload(metric) };
    },
  });
  try {
    assert.equal(database.prepare("SELECT count(*) AS count FROM observations").get().count, 0);
    await run({ database, service, handler: createApiHandler(database, () => new Date("2026-10-19T16:10:00.000Z")), databasePath });
  } finally {
    await service.stop();
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("fresh SQLite DB flows through ingestion, dashboard API, and rendered live UI", async () => {
  await withFreshDatabase(async ({ database, service, handler, databasePath }) => {
    assert.match(databasePath, /fresh\.sqlite$/);
    await service.pollCurrent();

    const result = callApi(handler, "/api/dashboard?region=central");
    assert.equal(result.status, 200);
    assert.equal(result.body.selectedRegion, "central");
    assert.equal(result.body.regions.length, 5);
    assert.equal(result.body.metrics.psi.latestByRegion.central.value, 35);
    assert.equal(result.body.metrics.pm25.latestByRegion.central.value, 35);
    assert.equal(result.body.metrics.psi.latestByRegion.central.freshness.state, "fresh");
    assert.equal(result.body.metrics.psi.series24h.length, 24);

    const rendered = await renderDashboardWithApiHandler(handler);
    assert.match(rendered.html, /<h1>Singapore air quality<\/h1>/);
    assert.match(rendered.html, /<strong>35<\/strong><small>PSI<\/small>/);
    assert.match(rendered.html, /<strong>35<\/strong><small>µg\/m³<\/small>/);
    assert.match(rendered.html, /<div class="reading-number">35<span>PSI<\/span>/);
    assert.match(rendered.html, /<div class="reading-number">35<span>µg\/m³<\/span>/);
    assert.match(rendered.html, /Fresh/);
    assert.equal(rendered.intervalScheduled, true);
  });
});

test("scheduled current refresh runs repeatedly and API reports retained data on provider failure", async () => {
  await withFreshDatabase(async ({ database, service, handler }) => {
    const start = service.start();
    const successfulPolls = await waitForPolls(database, 3);
    await service.stop();
    await start;
    assert.deepEqual(successfulPolls.map(row => row.count), [3, 3]);

    const before = callApi(handler, "/api/dashboard?region=central").body;
    assert.equal(before.metrics.pm25.latestByRegion.central.value, 35);

    const failingService = createIngestionService({
      database,
      attempts: 1,
      sleep: async () => {},
      now: () => new Date("2026-10-20T00:20:00.000Z"),
      fetchImpl: async url => {
        if (String(url).includes("pm25")) throw new Error("stubbed provider unavailable");
        return { ok: true, status: 200, json: async () => payload("psi") };
      },
    });
    try {
      await assert.rejects(failingService.pollCurrent(), /current air-quality feed/);
    } finally {
      await failingService.stop();
    }

    const after = callApi(handler, "/api/dashboard?region=central");
    assert.equal(after.status, 200);
    assert.equal(after.body.metrics.pm25.latestByRegion.central.value, 35);
    assert.equal(after.body.metrics.pm25.status.latestAttempt.status, "failed");
    assert.equal(after.body.metrics.pm25.status.error, "stubbed provider unavailable");

    const rendered = await renderDashboardWithApiHandler(handler);
    assert.match(rendered.html, /Showing last stored readings/);
    assert.match(rendered.html, /The latest poll or refresh failed; stored values are retained\./);
    assert.match(rendered.html, /stubbed provider unavailable/);
    assert.match(rendered.html, /<div class="reading-number">35<span>µg\/m³<\/span>/);
  });
});

test("empty dashboard API response renders the first-readings state", async () => {
  await withFreshDatabase(async ({ handler }) => {
    const rendered = await renderDashboardWithApiHandler(handler);
    assert.match(rendered.html, /No readings stored yet/);
    assert.match(rendered.html, /Current readings will appear after the first successful NEA data\.gov\.sg poll\./);
    assert.match(rendered.html, /Waiting for first reading/);
  });
});

test("dashboard API rejects unknown regions with an actionable response", async () => {
  await withFreshDatabase(async ({ handler }) => {
    const result = callApi(handler, "/api/dashboard?region=atlantis");
    assert.equal(result.status, 400);
    assert.equal(result.body.error, "Unknown region");
    assert.ok(result.body.availableRegions.includes("central"));
  });
});
