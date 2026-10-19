# Project-manager handoff: T-0006

- Task: [T-0006 — Opt-in five-minute auto refresh](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:42:25Z
- Recipient: worker
- Event: human-requested scope amendment and task dispatch
- Outcome: The human requested periodic NEA checks every five minutes, persisting new data and refreshing the dashboard when data changes, with the manual refresh action replaced by an on/off toggle. This amends the previously approved feature plan; T-0006 is `ready` and depends on completed T-0005.

## Decisions recorded

- “Toggle to turn on” means off by default; persist the preference in local storage.
- Enabling performs an immediate check, then checks every five minutes while the dashboard is open. If restored enabled after reload, resume immediately.
- Startup poll and history backfill remain. The server's unconditional recurring poll is disabled by default, so the toggle controls recurring current checks.
- A poll upserts idempotently and reports whether an observation was inserted or a value/source-update timestamp changed. If unchanged, show last-check time without reloading dashboard panels; if changed or failed, refresh the API snapshot so current values/error state render.
- Existing shared rate limiter must govern all current checks, backfill, and retries.

## Context passed

- Approved current implementation through T-0005 is committed as `adf7d48`.
- CodeGraph paths reviewed: `src/main.ts` current refresh action and one-minute API timer; `server/api.js` currently exposes GET dashboard/health; `server/ingestion.js` exposes `pollCurrent`, a 10-minute scheduler, and a shared six-per-ten-second provider limiter; `server/db.js` has unique-key upsert.
- Worker should implement only T-0006. Do not change task status or commit. Add/update tests and README, then append an evidence-based worker handoff for independent review.
