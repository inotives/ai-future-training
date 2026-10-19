# Project-manager handoff: T-0006

- Task: [T-0006 — Opt-in five-minute auto refresh](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:58:40Z
- Recipient: reviewer
- Event: re-review routing
- Outcome: T-0006 is in `review` after the provider-error recovery fix and startup-failure regression test.

## Context passed

- Prior review findings: [reviewer handoff 2](20261019_225649--reviewer-handoff-2.md).
- Revised worker evidence: [worker handoff 3](20261019_225832--worker-handoff-3.md).
- A successful unchanged poll now fetches a dashboard snapshot if the previously displayed snapshot has provider error status; otherwise unchanged results only update the status node.
- New regression covers feed failure → successful unchanged poll → provider error cleared. New startup-failure test verifies pending snapshot retries stop after startup poll failure settles.
- Worker reports 25 tests, build, and diff check pass.

## Review request

Verify the two added behaviors and that earlier fixes remain intact. Append a fresh reviewer verdict. After approval, the project manager will smoke-test the new POST poll endpoint through Vite and the toggle UI.
