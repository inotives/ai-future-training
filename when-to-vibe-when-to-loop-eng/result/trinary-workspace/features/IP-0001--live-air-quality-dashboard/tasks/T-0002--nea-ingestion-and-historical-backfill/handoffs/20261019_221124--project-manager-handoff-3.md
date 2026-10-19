# Project-manager handoff: T-0002

- Task: [T-0002 — NEA ingestion and historical backfill](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:11:24Z
- Recipient: worker
- Event: reviewer changes requested
- Outcome: T-0002 moves from `review` to `changes_requested`. The reviewer found that the default backfill delay can exceed the public rate limit.

## Context passed

- Reviewer finding: [reviewer handoff 1](20261019_221045--reviewer-handoff-1.md).
- Official public v2 Real-time limit cited by the reviewer: 6 calls per 10 seconds.
- Current code uses two feeds with a 1,000 ms default delay between historical requests, which can allow 10 calls per 10 seconds.
- Other source areas and the final stop-wait change were approved in review; checks passed at 9/9 tests, build, and diff check.

## Requested work

Set the default pacing so the combined PSI and PM2.5 historical requests cannot exceed six calls in any 10-second window (a two-second gap is sufficient for the current sequential importer). Update the pacing test to assert the compliant default. Do not add a required API key. Append a worker handoff and rerun relevant checks; no unrelated changes.
