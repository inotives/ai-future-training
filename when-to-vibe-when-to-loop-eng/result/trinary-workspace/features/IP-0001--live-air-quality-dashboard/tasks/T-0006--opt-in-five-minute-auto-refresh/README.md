---
id: T-0006
feature: IP-0001
title: Opt-in five-minute auto refresh
status: in_progress
depends_on: [T-0005]
---

# T-0006: Opt-in five-minute auto refresh

Feature plan: [IP-0001](../../README.md)

## Scope

- Add a local API action that checks both current NEA feeds, persists new or changed observations, and reports whether dashboard data changed.
- Replace the manual “Refresh now” button with an accessible on/off auto-refresh toggle, off by default, with its preference persisted locally.
- When enabled, run one check immediately and then every five minutes while the dashboard is open. When disabled, stop subsequent checks.
- Refresh the dashboard snapshot when a check finds new/changed readings or reports a provider failure; when no readings changed, show the last-check result without reloading all panels.
- Disable the server's unconditional recurring poll by default; retain its startup current poll and initial/resumable history backfill.
- Update the local runbook and cover toggle lifecycle, poll action, idempotent change detection, and failure behavior in tests.

## Out of scope

- Cross-device or server-persisted toggle preferences.
- Background polling when the dashboard is closed, push notifications, WebSockets, or server-sent events.
- Changing the five-minute cadence or adding additional data providers/metrics.

## Dependencies

- [T-0005 — Resilience checks and local runbook](../T-0005--resilience-checks-and-runbook/README.md)

## Acceptance criteria

- [ ] The old manual refresh action is replaced with an accessible toggle that is off by default and persists the user's choice across reloads.
- [ ] Enabling the toggle triggers a current PSI/PM2.5 check immediately and every five minutes while enabled; disabling it prevents later scheduled checks.
- [ ] No recurring server-side current poll runs while the toggle is off; startup poll and historical backfill still run.
- [ ] The shared rate limiter applies to toggle-triggered checks and all provider request attempts.
- [ ] New readings are stored idempotently. A poll reports data changed only when an observation is inserted or its value/source update timestamp changes; duplicate identical polls do not force a full dashboard refresh.
- [ ] When data changes, the UI fetches and renders the new API snapshot. With no changes it shows a successful last-check time; provider failures refresh status/error while retaining stored values.
- [ ] Automated coverage verifies immediate and five-minute scheduling, off/on/reload lifecycle, changed/no-change results, and failure behavior.
- [ ] The runbook describes the toggle behavior and how to verify it locally.

## Implementation notes

- Interpret “toggle to turn on” as opt-in, off by default. Persist enabled state in local storage; if enabled on reload, resume with an immediate check and the five-minute cadence.
- Do not alter backfill cadence or the published shared provider request limit.
- The task must not change task status; the project-manager owns status transitions.

## Handoffs

Append project-manager, worker, reviewer, and human-response records in [`handoffs/`](handoffs/). Do not overwrite earlier handoffs.
