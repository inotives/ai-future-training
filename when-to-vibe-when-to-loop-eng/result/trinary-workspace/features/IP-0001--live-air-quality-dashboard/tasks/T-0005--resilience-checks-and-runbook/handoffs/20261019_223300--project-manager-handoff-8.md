# Project-manager handoff: T-0005

- Task: [T-0005 — Resilience checks and local runbook](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:33:00Z
- Recipient: reviewer
- Event: re-review routing
- Outcome: T-0005 is in `review` after adding a shared limiter across startup/scheduled polls, historical requests, and retries.

## Context passed

- Runtime finding: [project-manager handoff 6](20261019_223029--project-manager-handoff-6.md), where the API/Vite browser smoke showed live values/history but logged an exhausted PSI date-query retry as HTTP 429.
- Revised worker implementation: [worker handoff 3](20261019_223239--worker-handoff-3.md).
- One FIFO rolling-window limiter now gates every fetch attempt across both feeds, all job types, and retries; tests cover initial two-feed polling plus immediate backfill (62 requests) and retry traffic. Limit is six calls per rolling ten seconds; API key remains optional.
- Worker reports 20/20 tests, build, and diff check pass.

## Review request

Independently verify the limiter truly covers each provider fetch attempt across all paths and respects the rolling window under startup/backfill/retry interleavings, assess deadlock/starvation/shutdown effects, and review tests/docs. Append a fresh verdict; do not implement. The project manager will rerun the live smoke after this source review.
