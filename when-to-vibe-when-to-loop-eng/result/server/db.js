import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const migrationsDirectory = new URL("./migrations/", import.meta.url);

export const defaultDatabasePath = resolve(process.env.AQI_DB_PATH ?? ".data/air-quality.sqlite");

export function openDatabase(databasePath = defaultDatabasePath) {
  if (databasePath !== ":memory:") mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  applyMigrations(database);
  return database;
}

export function applyMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
  const applied = new Set(database.prepare("SELECT version FROM schema_migrations").all().map(row => row.version));
  for (const version of [1, 2]) {
    if (applied.has(version)) continue;
    const migrationPath = fileURLToPath(new URL(`${String(version).padStart(3, "0")}_${version === 1 ? "initial" : "ingestion_progress"}.sql`, migrationsDirectory));
    // Migration scripts are trusted, versioned files shipped with this application.
    const sql = readFileSync(migrationPath, "utf8");
    database.exec("BEGIN IMMEDIATE;");
    try {
      database.exec(sql);
      database.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(version);
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }
}

export function upsertObservation(database, observation) {
  const { metric, region, value, observedAt, sourceUpdatedAt = null, fetchedAt } = observation;
  database.prepare(`
    INSERT INTO observations (metric, region_id, value, observed_at, source_updated_at, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(metric, region_id, observed_at) DO UPDATE SET
      value = excluded.value,
      source_updated_at = excluded.source_updated_at,
      fetched_at = excluded.fetched_at
  `).run(metric, region, value, observedAt, sourceUpdatedAt, fetchedAt);
}
