---
id: T-0003
feature: IP-0001
title: Dashboard read API and aggregates
status: in_progress
depends_on: [T-0002]
---

# T-0003: Dashboard read API and aggregates

Feature plan: [IP-0001](../../README.md)

## Scope

- Add typed local API responses for latest PSI and PM2.5 readings by region and associated region coordinates.
- Provide the latest 24 hours of selected-region data and seven-day hourly averages using Singapore local hours.
- Expose source freshness, last successful poll, and current ingestion error/status without hiding the last stored measurements.
- Define and document stable response types for the frontend task.

## Out of scope

- Direct provider ingestion changes.
- UI rendering, layout, and browser refresh behavior.
- Forecasting, additional pollutants, or arbitrary historical exploration.

## Dependencies

- [T-0002 — NEA ingestion and historical backfill](../T-0002--nea-ingestion-and-historical-backfill/README.md)

## Acceptance criteria

- [ ] API responses cover both metrics and all available regions with correct units and observation times.
- [ ] Latest values, 24-hour series, and seven-day hourly averages are derived from SQLite data.
- [ ] Seven-day aggregation uses `Asia/Singapore` hour boundaries and excludes missing readings rather than interpolating.
- [ ] Freshness is based on source update time or the last successful fetch, not observation timestamp alone.
- [ ] An upstream failure is represented in status while latest stored observations remain available.
- [ ] Response parsing and aggregation boundaries (no data, partial day, missing region, stale source) are covered by automated tests.

## Implementation notes

- Keep API response types in a module that can be imported by the frontend without importing server-only database code.
- Preserve the existing UI's PSI and PM2.5 metric semantics and units.
- The task must not change task status; the project-manager owns status transitions.

## Handoffs

Append project-manager, worker, reviewer, and human-response records in [`handoffs/`](handoffs/). Do not overwrite earlier handoffs.
