---
id: T-0002
feature: IP-0001
title: NEA ingestion and historical backfill
status: in_progress
depends_on: [T-0001]
---

# T-0002: NEA ingestion and historical backfill

Feature plan: [IP-0001](../../README.md)

## Scope

- Implement typed clients for the official PSI and PM2.5 data.gov.sg endpoints.
- Parse live and date-specific responses, preserving the provider's observation timestamp and update timestamp.
- Import the preceding 30 days of history by Singapore date on first run, with paced requests, resumable progress, bounded retries, and 429 backoff.
- Poll both live endpoints every 10 minutes and persist results using the schema from T-0001.
- Record ingestion success, failure, and last-success information for the read API and UI.

## Out of scope

- Public deployment, user authentication, or managing an API key for higher provider rate limits.
- Browser-side calls to data.gov.sg.
- Dashboard presentation and aggregation APIs.

## Dependencies

- [T-0001 — Local API and SQLite foundation](../T-0001--local-api-and-sqlite-foundation/README.md)

## Acceptance criteria

- [ ] Valid PSI and PM2.5 payloads are normalized into the SQLite schema for all five regions.
- [ ] Date-specific import covers 30 days and can resume after process restart without losing completed dates.
- [ ] Repeating a date import and polling the same observation twice do not create duplicate records.
- [ ] Missing regional values remain missing; source timestamps are not replaced with local fetch time.
- [ ] The 10-minute polling job records successful and failed runs and retains existing observations after a provider failure.
- [ ] Timeout, non-success HTTP status, 429, and malformed response cases are tested with bounded retry/backoff behavior.
- [ ] Historical requests are paced according to the current data.gov.sg rate-limit guidance.

## Implementation notes

- Endpoints: `https://api-open.data.gov.sg/v2/real-time/api/psi` and `https://api-open.data.gov.sg/v2/real-time/api/pm25`.
- Historical requests use the endpoint's `date` query in `Asia/Singapore`. A date query returned 24 hourly records in discovery; do not hard-code that every record or region must be present.
- The public feeds worked without an API key in discovery. Keep any optional key server-side and out of source control.
- The task must not change task status; the project-manager owns status transitions.

## Handoffs

Append project-manager, worker, reviewer, and human-response records in [`handoffs/`](handoffs/). Do not overwrite earlier handoffs.
