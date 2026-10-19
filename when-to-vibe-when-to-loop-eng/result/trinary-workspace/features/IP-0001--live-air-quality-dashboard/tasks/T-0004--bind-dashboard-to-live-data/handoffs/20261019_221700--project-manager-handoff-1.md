# Project-manager handoff: T-0004

- Task: [T-0004 — Bind the dashboard to live data](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:17:00Z
- Recipient: worker
- Event: implementation dispatch
- Outcome: T-0004 is `in_progress`; its read API dependency is complete. Bind the current UI to the local API according to the approved task brief and append a worker handoff. Do not change task status.

## Context passed

- Approved feature plan: [IP-0001](../../README.md).
- Task scope and acceptance criteria: [T-0004](../README.md).
- T-0003 read API implementation is committed as `bf25f3b`; endpoint is `/api/dashboard?region=<id>`, with latest readings, 24 hourly buckets, 7-day Singapore-hour profile, source/update timestamps, freshness, and ingestion status/error.
- Frontend-safe API types and client live in `src/data/dashboard-api.ts`.
- Preserve existing layout, map, metric/region interactions; replace fixture default, not necessarily fixture file. Poll local API every minute without duplicating timers/map instances. Source attribution: NEA/data.gov.sg.

## Requested work

Implement loading, empty, fresh, stale, and API-error states; retain last stored data and mark poll failures; show observation and source update times in Singapore time; bind all visible dashboard modules to consistent API data. Add appropriate tests/checks and accurately record results.
