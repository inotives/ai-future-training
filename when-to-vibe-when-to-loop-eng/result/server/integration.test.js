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
    readings: { [metric === "psi" ? "psi_twenty_four_hourly" : "pm25_one_hourly"]: { ...readings } },
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

async function callApiAsync(handler, url, method = "GET", headers = {}) {
  let status;
  let body;
  await new Promise(resolve => handler({ url, method, headers }, {
    writeHead(value) { status = value; },
    end(value) { body = value; resolve(); },
  }));
  return { status, body: JSON.parse(body) };
}

async function withFreshDatabase(run) {
  const directory = await mkdtemp(join(tmpdir(), "air-quality-integration-"));
  const databasePath = join(directory, "fresh.sqlite");
  const database = openDatabase(databasePath);
  const service = createIngestionService({
    database,
    attempts: 1,
    backfillDelayMs: 0,
    providerRequestLimit: 1_000,
    now: () => new Date("2026-10-19T16:10:00.000Z"),
    fetchImpl: async url => {
      const metric = String(url).includes("pm25") ? "pm25" : "psi";
      return { ok: true, status: 200, json: async () => payload(metric) };
    },
  });
  try {
    assert.equal(database.prepare("SELECT count(*) AS count FROM observations").get().count, 0);
    await run({ database, service, handler: createApiHandler(database, { now: () => new Date("2026-10-19T16:10:00.000Z"), ingestion: service }), databasePath });
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
    assert.equal(rendered.intervalScheduled, false, "auto refresh is off on a fresh browser profile");
  });
});

test("startup polls once and the on-demand API reports no-change checks", async () => {
  await withFreshDatabase(async ({ database, service, handler }) => {
    await service.start();
    const successfulPolls = database.prepare("SELECT count(*) AS count FROM ingestion_runs WHERE run_type = 'current' AND status = 'succeeded'").get().count;
    assert.equal(successfulPolls, 2, "startup performs one poll for each metric and does not schedule recurring checks");

    const firstCheck = await callApiAsync(handler, "/api/poll-current", "POST");
    assert.equal(firstCheck.status, 200);
    assert.equal(firstCheck.body.changed, false);
    assert.equal(firstCheck.body.error, null);
    const secondCheck = await callApiAsync(handler, "/api/poll-current", "POST");
    assert.equal(secondCheck.body.changed, false, "identical observations do not request a dashboard panel refresh");

    const before = callApi(handler, "/api/dashboard?region=central").body;
    assert.equal(before.metrics.pm25.latestByRegion.central.value, 35);

    const failingService = createIngestionService({
      database,
      attempts: 1,
      sleep: async () => {},
      now: () => new Date("2026-10-20T00:20:00.000Z"),
      fetchImpl: async url => {
        if (String(url).includes("pm25")) throw new Error("stubbed provider unavailable");
        const changedPsi = payload("psi");
        changedPsi.data.items[0].readings.psi_twenty_four_hourly.central = 41;
        return { ok: true, status: 200, json: async () => changedPsi };
      },
    });
    try {
      const failingHandler = createApiHandler(database, { ingestion: failingService, now: () => new Date("2026-10-20T00:20:00.000Z") });
      const partial = await callApiAsync(failingHandler, "/api/poll-current", "POST");
      assert.equal(partial.body.changed, true, "successful feed changes are reported even when the other feed fails");
      assert.match(partial.body.error, /current air-quality feed/);
    } finally {
      await failingService.stop();
    }

    const after = callApi(handler, "/api/dashboard?region=central");
    assert.equal(after.status, 200);
    assert.equal(after.body.metrics.psi.latestByRegion.central.value, 41);
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

test("current poll API permits matching local UI origins and no-Origin CLI calls, but rejects hostile or mismatched origins", async () => {
  await withFreshDatabase(async ({ database }) => {
    let pollCount = 0;
    const handler = createApiHandler(database, {
      ingestion: { pollCurrent: async () => { pollCount += 1; return { changed: false, recordsWritten: 0, errors: [] }; } },
    });

    const hostile = await callApiAsync(handler, "/api/poll-current", "POST", {
      origin: "https://attacker.example", host: "127.0.0.1:3556",
    });
    assert.equal(hostile.status, 403);
    const mismatched = await callApiAsync(handler, "/api/poll-current", "POST", {
      origin: "http://localhost:3555", host: "attacker.example",
    });
    assert.equal(mismatched.status, 403);
    assert.equal(pollCount, 0, "rejected browser origins never invoke ingestion");

    const viteOrigin = await callApiAsync(handler, "/api/poll-current", "POST", {
      origin: "http://127.0.0.1:3555", host: "127.0.0.1:3555",
    });
    assert.equal(viteOrigin.status, 200);
    const directLocalOrigin = await callApiAsync(handler, "/api/poll-current", "POST", {
      origin: "http://localhost:3556", host: "localhost:3556",
    });
    assert.equal(directLocalOrigin.status, 200);
    const cli = await callApiAsync(handler, "/api/poll-current", "POST");
    assert.equal(cli.status, 200, "intentional no-Origin CLI requests remain supported");
    assert.equal(pollCount, 3);
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

test("empty initial snapshot retries reads only while startup poll is running", async () => {
  await withFreshDatabase(async ({ database }) => {
    let releaseProvider;
    const providerGate = new Promise(resolve => { releaseProvider = resolve; });
    const startupService = createIngestionService({
      database,
      attempts: 1,
      backfillDelayMs: 0,
      providerRequestLimit: 1_000,
      now: () => new Date("2026-10-20T00:10:00.000Z"),
      fetchImpl: async url => {
        await providerGate;
        const metric = String(url).includes("pm25") ? "pm25" : "psi";
        return { ok: true, status: 200, json: async () => payload(metric) };
      },
    });
    const startup = startupService.start();
    try {
      const handler = createApiHandler(database, { ingestion: startupService });
      const ui = await renderDashboardWithApiHandler(handler);
      assert.match(ui.html, /Waiting for the startup NEA check/);
      assert.ok(ui.timeouts.some(timeout => timeout.active && timeout.delay === 1_000), "a bounded snapshot retry is scheduled");
      assert.equal(ui.fetchCalls.filter(call => call.url === "/api/poll-current").length, 0,
        "startup reconciliation never triggers a provider poll when auto refresh is off");

      releaseProvider();
      await startup;
      assert.equal(await ui.tickStartupSnapshotRetry(), true);
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.match(ui.html, /<h1>Singapore air quality<\/h1>/);
      assert.match(ui.html, /<div class="reading-number">35<span>PSI<\/span>/);
      assert.equal(ui.fetchCalls.filter(call => call.url === "/api/poll-current").length, 0,
        "the retry refreshes only the persisted snapshot");
      assert.equal(ui.timeouts.some(timeout => timeout.active), false, "the one-shot retry stops after readings arrive");
    } finally {
      releaseProvider();
      await startupService.stop();
      await startup.catch(() => {});
    }
  });
});

test("empty initial snapshot retry stops after the startup poll settles failed", async () => {
  await withFreshDatabase(async ({ database }) => {
    let releaseProvider;
    const providerGate = new Promise((_, reject) => { releaseProvider = reject; });
    const startupService = createIngestionService({
      database,
      attempts: 1,
      backfillDelayMs: 0,
      providerRequestLimit: 1_000,
      fetchImpl: async () => await providerGate,
    });
    const startup = startupService.start();
    let stopping;
    try {
      const handler = createApiHandler(database, { ingestion: startupService });
      const ui = await renderDashboardWithApiHandler(handler);
      assert.match(ui.html, /Waiting for the startup NEA check/);
      assert.ok(ui.timeouts.some(timeout => timeout.active && timeout.delay === 1_000));
      assert.equal(ui.fetchCalls.filter(call => call.url === "/api/poll-current").length, 0);

      stopping = startupService.stop();
      releaseProvider(new Error("NEA startup request failed"));
      await startup;
      await stopping;
      assert.equal(await ui.tickStartupSnapshotRetry(), true, "the scheduled retry takes one final settled snapshot");
      assert.match(ui.html, /No readings stored · provider error/);
      assert.equal(ui.timeouts.some(timeout => timeout.active), false, "settled failed startup polling cancels further retries");
      assert.equal(ui.fetchCalls.filter(call => call.url === "/api/poll-current").length, 0,
        "retrying the settled snapshot never triggers a provider poll");
    } finally {
      releaseProvider(new Error("test cleanup"));
      await startupService.stop();
      await startup.catch(() => {});
      await stopping;
    }
  });
});

test("a successful unchanged auto-check refreshes a stale provider-error snapshot", async () => {
  await withFreshDatabase(async ({ database }) => {
    let failProvider = false;
    const recoveryService = createIngestionService({
      database,
      attempts: 1,
      backfillDelayMs: 0,
      providerRequestLimit: 1_000,
      now: () => new Date("2026-10-20T00:10:00.000Z"),
      fetchImpl: async url => {
        if (failProvider) return { ok: false, status: 503, json: async () => ({}) };
        const metric = String(url).includes("pm25") ? "pm25" : "psi";
        return { ok: true, status: 200, json: async () => payload(metric) };
      },
    });
    try {
      const initial = await recoveryService.pollCurrent();
      assert.equal(initial.changed, true);
      const handler = createApiHandler(database, { ingestion: recoveryService });
      const ui = await renderDashboardWithApiHandler(handler);

      failProvider = true;
      ui.clickAutoRefresh();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.match(ui.html, /Showing last stored readings/);

      failProvider = false;
      const dashboardFetchesBeforeRecovery = ui.fetchCalls.filter(call => call.url.startsWith("/api/dashboard")).length;
      await ui.tickAutoRefresh();
      assert.equal(ui.fetchCalls.filter(call => call.url.startsWith("/api/dashboard")).length, dashboardFetchesBeforeRecovery + 1,
        "successful recovery reads a fresh DB snapshot despite unchanged values");
      assert.doesNotMatch(ui.html, /Showing last stored readings|provider error/,
        "the provider error banner clears after the successful unchanged poll");
    } finally {
      await recoveryService.stop();
    }
  });
});

test("auto-refresh toggle is off by default, polls immediately and every five minutes, and persists across reload", async () => {
  await withFreshDatabase(async ({ database, service }) => {
    let clockMinute = 0;
    const handler = createApiHandler(database, {
      ingestion: service,
      now: () => new Date(Date.parse("2026-10-20T00:10:00.000Z") + clockMinute++ * 60_000),
    });
    const ui = await renderDashboardWithApiHandler(handler);
    assert.match(ui.html, /role="switch" aria-checked="false"/);
    assert.match(ui.html, /Automatic checks are off/);
    assert.equal(ui.fetchCalls.filter(call => call.url === "/api/poll-current").length, 0);
    assert.equal(ui.intervalScheduled, false);

    ui.clickAutoRefresh();
    assert.equal(ui.storage["airwatch-auto-refresh"], "true");
    assert.match(ui.html, /role="switch" aria-checked="true"/);
    assert.equal(ui.intervals.find(interval => interval.active)?.delay, 5 * 60_000);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(ui.fetchCalls.filter(call => call.url === "/api/poll-current").length, 1, "enabling runs an immediate check");

    const dashboardFetchesBeforeUnchangedCheck = ui.fetchCalls.filter(call => call.url.startsWith("/api/dashboard")).length;
    const markupBeforeUnchangedCheck = ui.html;
    const mapCreationsBeforeUnchangedCheck = ui.mapStats.creations;
    const lastCheckBeforeUnchangedCheck = ui.refreshStatusText;
    await ui.tickAutoRefresh();
    assert.equal(ui.fetchCalls.filter(call => call.url === "/api/poll-current").length, 2);
    assert.equal(ui.fetchCalls.filter(call => call.url.startsWith("/api/dashboard")).length, dashboardFetchesBeforeUnchangedCheck,
      "an unchanged check does not fetch and render another dashboard snapshot");
    assert.equal(ui.html, markupBeforeUnchangedCheck, "an unchanged poll preserves all panel markup and controls");
    assert.equal(ui.mapStats.creations, mapCreationsBeforeUnchangedCheck, "an unchanged poll does not recreate Leaflet");
    assert.notEqual(ui.refreshStatusText, lastCheckBeforeUnchangedCheck, "the last-check text updates in place");

    const reloaded = await renderDashboardWithApiHandler(handler, ui.storage);
    assert.match(reloaded.html, /role="switch" aria-checked="true"/);
    assert.equal(reloaded.intervals.find(interval => interval.active)?.delay, 5 * 60_000);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(reloaded.fetchCalls.filter(call => call.url === "/api/poll-current").length, 1,
      "reloading with the saved preference enabled resumes with an immediate check");

    ui.clickAutoRefresh();
    assert.equal(ui.storage["airwatch-auto-refresh"], "false");
    assert.equal(ui.intervalScheduled, false, "disabling clears the scheduled five-minute check");
    await ui.tickAutoRefresh();
    assert.equal(ui.fetchCalls.filter(call => call.url === "/api/poll-current").length, 2);
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
