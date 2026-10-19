# Project-manager handoff: T-0006

- Task: [T-0006 — Opt-in five-minute auto refresh](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:43:10Z
- Recipient: worker
- Event: implementation dispatch
- Outcome: T-0006 is `in_progress` on the feature branch. Implement the human-requested scope amendment described in the approved task brief.

## Context passed

- T-0006 approved task baseline commit: `4e26c80`.
- Approved feature scope amendment and assumptions: [PM handoff 1](20261019_224225--project-manager-handoff-1.md).
- Current implementation commit before this task: `adf7d48`.
- Detailed acceptance criteria and dependency: [T-0006 brief](../README.md).

## Requested work

Implement server poll action, idempotent changed-data reporting, off-by-default persistent accessible toggle, immediate + five-minute checks while enabled, conditional dashboard refresh and failure status behavior. Disable unconditional server recurring poll by default while retaining startup poll/backfill. Update docs and tests. Do not change task status or commit; append a worker handoff with checks and limitations.
