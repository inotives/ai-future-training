# Project-manager handoff: T-0006

- Task: [T-0006 — Opt-in five-minute auto refresh](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:57:20Z
- Recipient: worker
- Event: focused rework dispatch
- Outcome: T-0006 is `in_progress` for error-state recovery and startup-failure retry coverage.

## Requested work

Clear a prior provider-error state after a successful no-change poll by refreshing the API snapshot only in that recovery case; test the full failure → unchanged success path. Test that the bounded clean-start GET retry stops when the startup poll settles failed. Return for independent review with a new worker handoff.
