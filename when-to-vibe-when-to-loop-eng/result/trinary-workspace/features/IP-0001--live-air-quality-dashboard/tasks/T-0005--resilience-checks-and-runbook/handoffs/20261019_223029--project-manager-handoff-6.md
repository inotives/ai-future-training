# Project-manager handoff: T-0005

- Task: [T-0005 — Resilience checks and local runbook](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:30:29Z
- Recipient: worker
- Event: integration finding after successful review
- Outcome: T-0005 returns from `review` to `changes_requested` based on a runtime observation from the manual smoke. The shared provider request rate needs enforcement across startup polling and historical backfill.

## Context passed

- Prior review approval: [reviewer handoff 2](20261019_222944--reviewer-handoff-2.md). It approved the rendered UI harness, in-process integration coverage, and runbook.
- PM successfully ran the combined API/Vite app on loopback ports 3566/3565 and observed live PSI/PM2.5 values for all five regions, observation/source update times, a 24-hour trend, and seven-day hourly history through Chrome.
- During that run the server logged `Backfill failed for psi 2026-10-18: data.gov.sg returned HTTP 429` after its bounded retries.
- T-0002 changed the backfill-only default delay to 2 seconds, but startup current polling and historical requests use the same upstream quota. The live 429 is new runtime evidence that calls need a shared limiter.

## Requested work

Implement a shared provider request limiter that keeps all PSI/PM2.5 calls (initial poll, scheduled poll, history, and retry attempts) at or below six requests in every 10-second window, while retaining bounded retries and avoiding poll starvation. Add deterministic tests covering the combined startup-poll + backfill burst and retries; update docs/defaults if needed. Run checks and append a worker handoff. Do not require an API key or make unrelated changes.
