import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase, upsertObservation } from "./db.js";
import { getDashboardSnapshot } from "./dashboard.js";
import { REGIONS } from "./ingestion.js";

const now = new Date("2026-10-20T01:30:00.000Z");
const fetchedAt = "2026-10-20T01:29:00.000Z";

function fixture() {
  const database = openDatabase(":memory:");
  const addRegion = database.prepare("INSERT INTO regions (id, name, latitude, longitude) VALUES (?, ?, ?, ?)");
  for (const region of REGIONS) addRegion.run(region.id, region.name, region.latitude, region.longitude);
  return database;
}

function addReading(database, metric, region, value, observedAt, sourceUpdatedAt = null, fetched = fetchedAt) {
  upsertObservation(database, { metric, region, value, observedAt, sourceUpdatedAt, fetchedAt: fetched });
}

test("empty dashboard includes every region, unavailable status, and explicit gaps", () => {
  const database = fixture();
  try {
    const result = getDashboardSnapshot(database, "central", now);
    assert.equal(result.timezone, "Asia/Singapore");
    assert.equal(result.regions.length, 5);
    assert.equal(result.metrics.psi.latestByRegion.central, null);
    assert.equal(result.metrics.psi.series24h.length, 24);
    assert.ok(result.metrics.psi.series24h.every(point => point.value === null));
    assert.deepEqual(result.metrics.psi.hourlyAverages7d, []);
    assert.equal(result.metrics.psi.latestByRegion.central, null);
    assert.equal(result.metrics.psi.status.latestAttempt, null);
  } finally { database.close(); }
});

test("latest values retain last known data and expose stale source and failed poll", () => {
  const database = fixture();
  try {
    addReading(database, "psi", "central", 38, "2026-10-20T00:00:00.000Z", "2026-10-20T00:10:00.000Z");
    addReading(database, "pm25", "central", 12, "2026-10-20T00:00:00.000Z", null, "2026-10-20T00:15:00.000Z");
    database.prepare(`INSERT INTO ingestion_runs (metric, run_type, started_at, completed_at, status, error)
      VALUES ('psi', 'current', ?, ?, 'failed', ?)`)
      .run("2026-10-20T01:20:00.000Z", "2026-10-20T01:20:01.000Z", "provider timeout");
    const result = getDashboardSnapshot(database, "central", now);
    const psi = result.metrics.psi.latestByRegion.central;
    assert.equal(psi.value, 38);
    assert.equal(psi.unit, "index");
    assert.equal(psi.freshness.referenceAt, "2026-10-20T00:10:00.000Z");
    assert.equal(psi.freshness.state, "stale");
    assert.equal(result.metrics.psi.status.error, "provider timeout");
    assert.equal(result.metrics.psi.status.latestAttempt.status, "failed");
    const pm25 = result.metrics.pm25.latestByRegion.central;
    assert.equal(pm25.unit, "µg/m³");
    assert.equal(pm25.freshness.referenceAt, "2026-10-20T00:15:00.000Z");
    assert.equal(pm25.freshness.state, "stale");
    assert.equal(result.metrics.pm25.status.error, null);
  } finally { database.close(); }
});

test("24-hour series leaves missing hours empty and excludes observations outside window", () => {
  const database = fixture();
  try {
    addReading(database, "psi", "central", 51, "2026-10-19T02:00:00.000Z");
    addReading(database, "psi", "central", 53, "2026-10-20T00:00:00.000Z");
    addReading(database, "psi", "central", 99, "2026-10-18T01:00:00.000Z");
    const points = getDashboardSnapshot(database, "central", now).metrics.psi.series24h;
    assert.equal(points.length, 24);
    assert.deepEqual(points.filter(point => point.value !== null).map(point => point.value), [51, 53]);
    assert.equal(points.find(point => point.observedAt === "2026-10-20T00:00:00.000Z").value, 53);
  } finally { database.close(); }
});

test("seven-day averages use Singapore clock hours and count only days with data", () => {
  const database = fixture();
  try {
    addReading(database, "pm25", "central", 10, "2026-10-19T00:00:00.000Z"); // 08:00 SGT
    addReading(database, "pm25", "central", 30, "2026-10-18T00:00:00.000Z"); // 08:00 SGT
    addReading(database, "pm25", "central", 20, "2026-10-19T01:00:00.000Z"); // 09:00 SGT
    addReading(database, "pm25", "central", 90, "2026-10-12T00:00:00.000Z"); // outside window
    const averages = getDashboardSnapshot(database, "central", now).metrics.pm25.hourlyAverages7d;
    assert.deepEqual(averages, [
      { hour: 8, average: 20, sampleCount: 2, daysWithReadings: 2 },
      { hour: 9, average: 20, sampleCount: 1, daysWithReadings: 1 },
    ]);
  } finally { database.close(); }
});

test("unknown region is reported with available region ids", () => {
  const database = fixture();
  try {
    const result = getDashboardSnapshot(database, "atlantis", now);
    assert.equal(result.error, "Unknown region");
    assert.ok(result.availableRegions.includes("central"));
  } finally { database.close(); }
});
