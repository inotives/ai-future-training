# Project-manager handoff: T-0003

- Task: [T-0003 — Dashboard read API and aggregates](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:13:15Z
- Recipient: worker
- Event: implementation dispatch
- Outcome: T-0003 is `in_progress`; both dependencies are done. Implement only the dashboard read API and its response/aggregation contracts, then append a worker handoff. Do not change task status.

## Context passed

- Approved feature plan: [IP-0001](../../README.md).
- Task scope and acceptance criteria: [T-0003](../README.md).
- T-0001/T-0002 foundation and ingestion are committed through `72ffc88`.
- Database holds PSI and PM2.5 observations by region and timestamp, plus ingestion run success/failure metadata. Ingestion uses Singapore date imports, 10-minute polls, retains last-known rows on failures, and defaults to rate-compliant two-second pacing between historical requests.
- Existing dashboard consumes PSI and PM2.5 for the five canonical regions; expose frontend-importable types without server-only imports.

## Requested work

Implement stable typed API response contracts, latest readings, 24-hour selected-region series, seven-day Singapore-hour averages, and freshness/status/error semantics that preserve stored measurements on upstream failure. Cover boundaries and partial/missing/stale states in tests and document the contract. Run appropriate checks and accurately report them.
