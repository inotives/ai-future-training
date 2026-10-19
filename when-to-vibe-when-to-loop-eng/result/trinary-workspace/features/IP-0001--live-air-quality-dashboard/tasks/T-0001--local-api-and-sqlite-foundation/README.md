---
id: T-0001
feature: IP-0001
title: Local API and SQLite foundation
status: ready
depends_on: []
---

# T-0001: Local API and SQLite foundation

Feature plan: [IP-0001](../../README.md)

## Scope

- Add the Node API runtime and local development command alongside the existing Vite app.
- Add SQLite initialization and versioned schema setup for regions, metric observations, and ingestion-run status.
- Store observation time, source update time, local fetch time, metric, region, and value with an idempotent key on metric + region + observation time.
- Configure Vite to proxy local `/api` requests to the Node service.
- Document the minimum local startup and database location needed by later tasks.

## Out of scope

- Provider polling or historical backfill.
- Dashboard UI changes and final read-model API behavior.
- Cloud databases, public deployment, authentication, or multi-user access.

## Dependencies

- None.

## Acceptance criteria

- [ ] A fresh local setup can initialize SQLite and apply the schema without a pre-existing database.
- [ ] The schema records region, metric, reading value, observation timestamp, source update timestamp, and fetch timestamp.
- [ ] The database prevents duplicate rows for the same metric, region, and observation timestamp.
- [ ] The Node API and Vite development server run locally together, with Vite proxying `/api` to the API service.
- [ ] Automated tests cover database initialization, migration behavior, and uniqueness/upsert constraints.
- [ ] Existing unrelated worktree edits remain untouched.

## Implementation notes

- Use a small Node service that fits the repository's TypeScript/Vite setup; keep API and database configuration local and avoid requiring cloud credentials.
- Keep schema setup reproducible and versioned. Later ingestion and read API tasks depend on these stable tables and timestamp semantics.
- The task must not change task status; the project-manager owns status transitions.

## Handoffs

Append project-manager, worker, reviewer, and human-response records in [`handoffs/`](handoffs/). Do not overwrite earlier handoffs.
