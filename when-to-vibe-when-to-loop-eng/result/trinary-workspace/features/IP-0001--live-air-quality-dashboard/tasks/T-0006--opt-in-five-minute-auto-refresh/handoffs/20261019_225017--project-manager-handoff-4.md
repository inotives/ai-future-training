# Project-manager handoff: T-0006

- Task: [T-0006 — Opt-in five-minute auto refresh](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:50:17Z
- Recipient: worker
- Event: reviewer changes requested
- Outcome: T-0006 moves from `review` to `changes_requested` for three behavior and boundary issues.

## Context passed

- Reviewer findings: [reviewer handoff 1](20261019_224937--reviewer-handoff-1.md).
- Main polling, persistence, change detection, shared limiter, and timer behavior were approved in review; current tests/build/diff check pass.

## Requested work

1. Validate `Origin` on `POST /api/poll-current`: allow legitimate local UI origins used by Vite and direct local app, reject hostile/mismatched browser origins before invoking ingestion; allow intentional requests with no Origin for CLI/tests. Add route tests proving rejected calls do not poll.
2. On a successful unchanged check, update only the last-check status element in place. Do not call the full render path, replace dashboard panels, recreate Leaflet, or lose focus. Add a regression test asserting visible status updates without replacing panel markup/map.
3. Handle a clean-load race: if the page fetches an empty snapshot while the one-time startup poll is still running, keep a clear pending state and retry the snapshot after a short bounded interval until readings arrive or the startup poll fails; must not invoke provider polling while auto refresh is off.

Run focused/full checks, append a new worker handoff, no unrelated changes or task status edits.
