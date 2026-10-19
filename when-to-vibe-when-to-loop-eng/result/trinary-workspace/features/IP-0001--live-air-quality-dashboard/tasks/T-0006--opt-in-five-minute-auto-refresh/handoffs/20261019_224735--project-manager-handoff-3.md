# Project-manager handoff: T-0006

- Task: [T-0006 — Opt-in five-minute auto refresh](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:47:35Z
- Recipient: reviewer
- Event: implementation review routing
- Outcome: T-0006 is in `review`; independently assess its implementation against the amended feature scope and task criteria.

## Context passed

- Approved task brief and decisions: [T-0006](../README.md), [PM handoff 1](20261019_224225--project-manager-handoff-1.md).
- Worker summary and checks: [worker handoff 1](20261019_224723--worker-handoff-1.md).
- Current poll endpoint is `POST /api/poll-current`; it shares the backend's single-flight poll and six-per-ten-second request limiter.
- The always-on server interval is removed by default; startup poll and historical backfill remain.
- Frontend toggle is accessible, persisted, off by default, and invokes immediately plus every five minutes while enabled; snapshots refresh on changed data or error only.
- Worker reports 21/21 tests, build, and diff check passed; no live provider smoke was run for this task.

## Review request

Verify inserted/value/source-update change detection and idempotence, poll endpoint security/error/partial failure semantics, server startup/shutdown and optional interval behavior, toggle lifecycle/persistence/immediate and five-minute cadence, conditional refresh, and limiter reuse. Check tests/docs and regressions. Append a fresh verdict; do not implement.
