import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { applyMigrations, openDatabase, upsertObservation } from "./db.js";

test("fresh database initializes schema and migrations are idempotent", () => {
  const directory = mkdtempSync(join(tmpdir(), "air-quality-db-"));
  const path = join(directory, "nested", "test.sqlite");
  try {
    const database = openDatabase(path);
    applyMigrations(database);
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name);
    assert.deepEqual(tables.sort(), ["ingestion_runs", "observations", "regions", "schema_migrations"].sort());
    assert.equal(database.prepare("SELECT count(*) AS count FROM schema_migrations").get().count, 1);
    database.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("observations enforce unique metric/region/time and upsert in place", () => {
  const database = openDatabase(":memory:");
  database.prepare("INSERT INTO regions (id, name) VALUES (?, ?)").run("central", "Central");
  const base = {
    metric: "psi", region: "central", observedAt: "2026-10-20T08:00:00+08:00",
    sourceUpdatedAt: "2026-10-20T08:05:00+08:00", fetchedAt: "2026-10-20T08:06:00Z",
  };
  upsertObservation(database, { ...base, value: 42 });
  upsertObservation(database, { ...base, value: 43, fetchedAt: "2026-10-20T08:07:00Z" });
  const rows = database.prepare("SELECT metric, region_id, value, observed_at, source_updated_at, fetched_at FROM observations").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].value, 43);
  assert.equal(rows[0].region_id, "central");
  assert.equal(rows[0].source_updated_at, base.sourceUpdatedAt);
  assert.equal(rows[0].fetched_at, "2026-10-20T08:07:00Z");
  assert.throws(() => database.prepare(`
    INSERT INTO observations (metric, region_id, value, observed_at, fetched_at) VALUES ('psi', 'central', 55, ?, ?)
  `).run(base.observedAt, base.fetchedAt), /UNIQUE constraint failed/);
  database.close();
});
