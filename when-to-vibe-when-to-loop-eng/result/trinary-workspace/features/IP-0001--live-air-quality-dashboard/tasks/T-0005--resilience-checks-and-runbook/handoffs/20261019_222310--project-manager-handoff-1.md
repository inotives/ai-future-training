# Project-manager handoff: T-0005

- Task: [T-0005 — Resilience checks and local runbook](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:23:10Z
- Recipient: worker
- Event: implementation dispatch
- Outcome: T-0005 is `in_progress`; all prior tasks are approved and complete. Verify integration behavior, document local setup/recovery, and append an evidence-based worker handoff. Do not change task status.

## Context passed

- Approved task and acceptance criteria: [T-0005](../README.md).
- Feature scope and acceptance: [IP-0001](../../README.md).
- Completed T-0004 UI binding is committed as `047df56`; API, ingestion, and DB foundation precede it on the feature branch.
- Automated provider tests are mocked. User-approved behavior includes 30-day initial backfill, 10-minute polling, one-minute UI refresh, SQLite local data, stale/error signaling with retained readings.
- Previous local smoke attempts could not bind loopback ports (`listen EPERM` at 127.0.0.1:3566); record the limitation honestly and explore a safe available verification path if possible.

## Requested work

Add deterministic integration coverage for fresh DB → ingestion → dashboard API/UI and provider failure → retained data/error. Document clean local startup, prerequisites, database location, polling/backfill, and recovery. Run feature checks and record exact evidence. Resolve only within approved feature scope.
