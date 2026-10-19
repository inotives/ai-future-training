# Project-manager handoff: T-0006

- Task: [T-0006 — Opt-in five-minute auto refresh](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:57:15Z
- Recipient: worker
- Event: reviewer changes requested
- Outcome: T-0006 moves from `review` to `changes_requested` for a stale provider-error state after recovery.

## Context passed

- Reviewer re-review: [reviewer handoff 2](20261019_225649--reviewer-handoff-2.md).
- The prior changes for origin validation, status-only rendering, startup snapshot retry, toggle lifecycle and limiter were approved.
- Bug: after an earlier feed failure, a successful poll with identical values returns `changed: false`, so the dashboard data snapshot is not fetched; the old provider error remains visible.

## Requested work

Refresh the API snapshot on a successful no-change poll when the current snapshot contains a provider error, so the error clears while panels update only on recovery. Add failure → successful unchanged poll coverage. Also add the reviewer's suggested startup-poll-failure test asserting the bounded snapshot retry stops once startup polling settles failed. Keep scope focused; append a new worker handoff and run checks.
