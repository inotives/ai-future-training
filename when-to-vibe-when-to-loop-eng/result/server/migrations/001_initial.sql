CREATE TABLE regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  latitude REAL,
  longitude REAL
);

CREATE TABLE observations (
  id INTEGER PRIMARY KEY,
  metric TEXT NOT NULL CHECK (metric IN ('psi', 'pm25')),
  region_id TEXT NOT NULL REFERENCES regions(id),
  value REAL NOT NULL,
  observed_at TEXT NOT NULL,
  source_updated_at TEXT,
  fetched_at TEXT NOT NULL,
  UNIQUE (metric, region_id, observed_at)
);

CREATE INDEX observations_metric_region_time
  ON observations(metric, region_id, observed_at DESC);

CREATE TABLE ingestion_runs (
  id INTEGER PRIMARY KEY,
  metric TEXT NOT NULL CHECK (metric IN ('psi', 'pm25')),
  run_type TEXT NOT NULL CHECK (run_type IN ('current', 'backfill')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  records_written INTEGER NOT NULL DEFAULT 0 CHECK (records_written >= 0),
  error TEXT
);

CREATE INDEX ingestion_runs_metric_started
  ON ingestion_runs(metric, started_at DESC);
