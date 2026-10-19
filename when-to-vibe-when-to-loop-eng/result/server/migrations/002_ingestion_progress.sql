ALTER TABLE ingestion_runs ADD COLUMN requested_date TEXT;

CREATE INDEX ingestion_runs_backfill_progress
  ON ingestion_runs(metric, run_type, requested_date, status);
