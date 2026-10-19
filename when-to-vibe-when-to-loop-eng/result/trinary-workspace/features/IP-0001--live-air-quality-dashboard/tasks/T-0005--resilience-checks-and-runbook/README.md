---
id: T-0005
feature: IP-0001
title: Resilience checks and local runbook
status: ready
depends_on: [T-0004]
---

# T-0005: Resilience checks and local runbook

Feature plan: [IP-0001](../../README.md)

## Scope

- Add end-to-end or integration coverage for the local API, database-backed dashboard, recurring refresh, and provider failure behavior.
- Document clean local setup, database initialization, data-source behavior, backfill progress, and common recovery steps.
- Run the feature-level build and acceptance checks and record commands and evidence for the project-manager.
- Resolve any integration issues discovered across the completed tasks without expanding the approved feature scope.

## Out of scope

- Deployment, hosted database setup, production monitoring, and authentication.
- New product behavior or data sources.

## Dependencies

- [T-0004 — Bind the dashboard to live data](../T-0004--bind-dashboard-to-live-data/README.md)

## Acceptance criteria

- [ ] Integration coverage demonstrates a fresh database, populated readings, dashboard API responses, and rendered live data.
- [ ] Failure coverage demonstrates retained last-known data and a visible stale/error state after provider failure.
- [ ] Local run instructions work from a clean checkout without undocumented secrets or manually edited files.
- [ ] Feature build and automated checks pass; exact commands and results are recorded in the worker handoff.
- [ ] Any remaining limitations are recorded with evidence and do not contradict the approved IP acceptance criteria.

## Implementation notes

- Keep checks deterministic by stubbing provider responses for automated tests; use the live endpoint only for a documented manual smoke check.
- The task must not change task status; the project-manager owns status transitions.

## Handoffs

Append project-manager, worker, reviewer, and human-response records in [`handoffs/`](handoffs/). Do not overwrite earlier handoffs.
