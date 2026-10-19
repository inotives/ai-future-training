---
id: IP-0001
title: Ingest Live Air Quality Data and Bind the Dashboard
status: Approved
branch: feat/live-air-quality-dashboard
created_at: 2026-10-19T21:54:04Z
---

# IP-0001: Ingest Live Air Quality Data and Bind the Dashboard

## Goal

Replace the dashboard's synthetic PSI and PM2.5 fixture with real Singapore air-quality observations stored in a local SQLite database. Keep the existing dashboard presentation and connect its summaries, regional map, selected-region details, trends, and hourly profile to an API backed by that database.

## Context and repository findings

- CodeGraph exploration of `src/main.ts` and `src/data/temperature-fixture.ts` shows that the UI reads the fixture directly. The fixture contains five Singapore regions, 24-hour PSI, 1-hour PM2.5, and 168 hourly synthetic samples. The main UI has no other data caller.
- The UI already includes regional summaries, a map, measure and region selection, a 24-hour trend, a seven-day hourly profile, and loading/error demo states. It currently labels its readings synthetic and not current.
- The README and package name say “Singapore Temperature Explorer,” but the rendered UI and data fixture are for Singapore air quality. The user confirmed PSI + PM2.5 as the feature scope.
- `package.json` configures a Vite and TypeScript frontend. There is no server, database, schema, migration, ingestion job, or API route in this project.
- Git's repository root is the parent `ai-future-training` repository. Existing changes outside this project folder were present before this plan. The user authorized creating the feature branch while preserving those edits; the branch is `feat/live-air-quality-dashboard`.
- No `trinary-workspace/` or prior feature plans existed in this project when this plan was started.

## Scope

- Add a small local Node API and SQLite persistence layer to this project. Vite will proxy the API during local development.
- Ingest the official data.gov.sg / NEA PSI and PM2.5 feeds, including a 30-day initial historical backfill and ongoing updates.
- Store timestamped regional readings with their metric, observation time, source update time, and local ingestion time. Make ingestion idempotent and paced; handle HTTP errors, malformed responses, missing values, and rate limits with bounded retries/backoff.
- Poll both source feeds every 10 minutes. Refresh dashboard data from the local API every minute.
- Provide the UI with latest readings, recent time series, seven-day hourly aggregates, source/update status, and region metadata through typed API responses.
- Replace the fixture-driven demo state with real loading, empty, stale, and error behavior. Keep the existing layout and interactions, use SGT for display, and retain the last stored readings during upstream outages.
- Add focused automated coverage for persistence, parsing, history backfill, duplicate protection, aggregation, and outage behavior, plus run the production build and record manual end-to-end evidence.

## Explicit non-goals

- Public deployment, cloud-hosted persistence, authentication, or multi-user access.
- Temperature data, forecasts, health advice, haze-event detection, alerting, or adding additional pollutants.
- A redesign of the dashboard's visual layout or map.
- Importing all years of provider history. The initial import is limited to 30 days; additional history can be planned separately if needed.

## Proposed design

1. Add a Node server with SQLite schema/migrations and a local development command. Keep provider credentials out of the browser; the feeds worked without an API key during discovery. Allow an optional key to be configured later if higher data.gov.sg rate limits are needed.
2. Implement a provider client for the official endpoints below. On first run, request the last 30 days by date, then fetch the current values. Process historical requests sequentially with pacing and resumable progress so a rate limit or restart does not lose completed work. Continue polling both current endpoints every 10 minutes.
3. Normalize readings into one row per metric, region, and observation timestamp. Preserve the upstream `timestamp` and `updatedTimestamp` separately from `fetchedAt`. Use a unique key on metric, region, and observation timestamp so retries and overlapping polls safely upsert data.
4. Expose a read API for the latest regional values, 24-hour trend, seven-day hourly averages, region coordinates, and ingestion health. Use source update / successful-fetch times to determine freshness; do not mark an hourly observation stale merely because its observation timestamp is older than 30 minutes.
5. Replace direct fixture reads in `src/main.ts` with a typed API client. Refresh at one-minute intervals, preserve the user's selected metric and region across refreshes, and show the last known data with a stale/error status if an upstream poll fails. Remove synthetic-data and demo-state copy from the live view while retaining useful loading, no-data, and error affordances.

### Data source evidence

The official real-time endpoints and their date queries were inspected through Agent Reach's Jina Reader route on 2026-10-19 UTC. Both metrics returned 24 hourly items for the queried date, with five regional measurements and source timestamps. Date-specific queries also returned 24 items for 2023-10-20 in spot checks, so the selected 30-day bootstrap window is within observed history availability.

- [NEA PSI dataset and API](https://data.gov.sg/datasets/d_fe37906a0182569d891506e815e819b7/view) — endpoint: [api-open.data.gov.sg/v2/real-time/api/psi](https://api-open.data.gov.sg/v2/real-time/api/psi)
- [NEA PM2.5 dataset and API](https://data.gov.sg/datasets/d_e1058d6974c877257e32048ab128ad83/view) — endpoint: [api-open.data.gov.sg/v2/real-time/api/pm25](https://api-open.data.gov.sg/v2/real-time/api/pm25)
- [data.gov.sg API rate limits](https://guide.data.gov.sg/developer-guide/api-overview/api-rate-limits) — use paced backfill, retry/backoff on 429 responses, and an optional API key if higher limits become necessary.

## Decisions

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-10-19 | Build for PSI and PM2.5 air quality. | This matches the existing rendered dashboard and fixture; the temperature name is stale boilerplate. |
| 2026-10-19 | Target a local-first app with a Node API and SQLite. | No database or server exists in the project, and this keeps a runnable local setup without cloud credentials. |
| 2026-10-19 | Backfill 30 days on first run. | This covers the existing 24-hour and seven-day UI and leaves room for later historical views. |
| 2026-10-19 | Poll the provider every 10 minutes and refresh the UI every minute. | This keeps local readings current without tightly coupling browser requests to the external provider. |
| 2026-10-19 | Preserve last-known readings and show freshness/error state on source failure. | A transient outage must not erase valid stored observations or present them as current. |
| 2026-10-19 | Create the feature branch while leaving existing edits untouched. | The user approved `feat/live-air-quality-dashboard`; only this plan will be staged for its eventual plan commit. |
| 2026-10-19 | User approved this implementation plan. | Approval was given in chat after review of the draft; task decomposition may proceed. |

## Human decisions and open questions

### Confirmed by the user

- Use the current PSI + PM2.5 air-quality dashboard as the product scope.
- Target a local-first implementation.
- Create a feature branch from `main` and preserve all pre-existing worktree edits.
- Use a Node API and SQLite.
- Backfill 30 days initially.
- Poll both feeds every 10 minutes; refresh the dashboard every minute; retain last-known data and surface staleness/errors when the provider fails.

### Open questions

None for the proposed scope. The user explicitly approved this plan on 2026-10-19 at 21:55 UTC; task decomposition may proceed.

## Acceptance checks

1. A clean local setup can initialize SQLite, start the API and Vite UI, and render the dashboard without synthetic fixture data.
2. A first run imports up to 30 days of PSI and PM2.5 by Singapore date, records five-region readings and source timestamps, respects rate limits, and can resume safely after interruption.
3. Repeating a date import or current poll does not create duplicate observations. Missing regional values remain missing and are not interpolated.
4. The read API returns values that match the corresponding stored/source records for all regions and both measures. Times are presented in SGT; freshness uses source update or successful-fetch time rather than observation time alone.
5. The UI's highest-value cards, region list, map, selected-region details, 24-hour trend, and seven-day hourly profile use database-backed responses while preserving region and metric selection across refreshes.
6. The API ingestion job runs at the configured 10-minute cadence and the UI fetches at the configured one-minute cadence. Neither job creates duplicate measurements.
7. Simulated network errors, 429 responses, malformed payloads, and empty datasets retain stored observations, expose a clear stale/error/no-data state, and retry within bounded backoff.
8. Automated tests cover source parsing, date backfill, persistence/upsert, aggregation, and failure handling; `npm run build` succeeds; a manual local run demonstrates live values, history, and an outage state.
9. The UI identifies NEA/data.gov.sg as its source and displays the relevant observation/update time so users can judge freshness.

## Proposed task breakdown

Task folders are intentionally not created before plan approval. After approval, create these task briefs and dependencies:

1. [T-0001 — Local API and SQLite foundation](tasks/T-0001--local-api-and-sqlite-foundation/README.md) — no dependencies.
2. [T-0002 — NEA ingestion and historical backfill](tasks/T-0002--nea-ingestion-and-historical-backfill/README.md) — depends on T-0001.
3. [T-0003 — Dashboard read API and aggregates](tasks/T-0003--dashboard-read-api-and-aggregates/README.md) — depends on T-0002.
4. [T-0004 — Bind the dashboard to live data](tasks/T-0004--bind-dashboard-to-live-data/README.md) — depends on T-0003.
5. [T-0005 — Resilience, automated checks, and local runbook](tasks/T-0005--resilience-checks-and-runbook/README.md) — depends on T-0004.

## Final human acceptance

- Evidence: pending implementation.
- Human decision: pending implementation acceptance.
- Acceptance date: pending.
