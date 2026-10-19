# Project-manager handoff: T-0002

- Task: [T-0002 — NEA ingestion and historical backfill](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:05:25Z
- Recipient: worker
- Event: implementation dispatch
- Outcome: T-0002 is `in_progress`; T-0001 is done and its foundation is available. Implement only the assigned ingestion task and append a worker handoff; do not change task status.

## Context passed

- Approved feature plan: [IP-0001](../../README.md).
- Approved task scope and acceptance checks: [T-0002](../README.md).
- T-0001 foundation commit: `365b86a`.
- T-0001 implementation and verification: [T-0001 handoff records](../../T-0001--local-api-and-sqlite-foundation/handoffs/).
- User-approved decisions: Node API + SQLite, PSI and PM2.5, 30-day initial historical backfill, poll every 10 minutes, local-first, retain last-known readings and surface stale/error on provider failure.
- Official endpoint research is recorded in the feature plan; date-specific PSI and PM2.5 queries returned hourly records, and provider rate-limit guidance calls for pacing and retry/backoff on 429.

## Requested work

Implement typed data.gov.sg clients, date-based 30-day backfill, resumable/paced/retried ingestion, and 10-minute polling using the established schema. Add focused tests and documentation required by the task brief. Run appropriate checks and report only checks actually performed.
