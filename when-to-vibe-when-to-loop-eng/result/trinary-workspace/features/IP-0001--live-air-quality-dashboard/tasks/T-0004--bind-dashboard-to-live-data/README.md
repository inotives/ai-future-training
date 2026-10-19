---
id: T-0004
feature: IP-0001
title: Bind the dashboard to live data
status: ready
depends_on: [T-0003]
---

# T-0004: Bind the dashboard to live data

Feature plan: [IP-0001](../../README.md)

## Scope

- Replace direct reads from `src/data/temperature-fixture.ts` with the typed local API client.
- Connect summary cards, regional rows, map values, region details, trend chart, and hourly profile to API responses.
- Refresh from the local API every minute while preserving selected region and metric.
- Replace the synthetic demo-state control and copy with real loading, empty, fresh, stale, and API error states.
- Display observation and source update times in SGT, and attribute the data to NEA/data.gov.sg.

## Out of scope

- Changing the dashboard layout or adding metrics and forecast features.
- Calling data.gov.sg directly from the browser.
- Removing the fixture file if it remains useful for isolated UI development; it must not be the live app's default data path.

## Dependencies

- [T-0003 — Dashboard read API and aggregates](../T-0003--dashboard-read-api-and-aggregates/README.md)

## Acceptance criteria

- [ ] The normal dashboard view renders values from the local API and no longer labels those values synthetic or demo data.
- [ ] Metric selection and region selection continue to work and remain selected after a one-minute refresh.
- [ ] Cards, map, region rows, details, 24-hour trend, and seven-day profile agree with the API response.
- [ ] Loading, empty database, stale data, and API failure states are accessible and understandable.
- [ ] When an upstream poll fails, the UI retains the last stored values and marks their freshness/error status clearly.
- [ ] The UI identifies the source and distinguishes observation time from the last source update.
- [ ] Existing responsive layout and map interactions continue to work.

## Implementation notes

- Use a cancellable or otherwise safe refresh loop so rerenders do not create duplicate timers or map instances.
- Keep visual language and current interaction patterns; this task changes the source and state behavior, not the product design.
- The task must not change task status; the project-manager owns status transitions.

## Handoffs

Append project-manager, worker, reviewer, and human-response records in [`handoffs/`](handoffs/). Do not overwrite earlier handoffs.
