# Project-manager handoff: T-0005

- Task: [T-0005 — Resilience checks and local runbook](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:30:34Z
- Recipient: worker
- Event: integration rework dispatch
- Outcome: T-0005 is `in_progress` for the shared provider-rate limiting fix requested in [handoff 6](20261019_223029--project-manager-handoff-6.md).

## Requested work

Coordinate every provider request attempt through a common sliding-window or equivalent limiter so all feeds and retries respect six calls per ten seconds across poll/backfill. Cover the startup poll plus immediate backfill sequence in deterministic tests. Update worker handoff; then the project manager will route for independent review and rerun the local smoke.
