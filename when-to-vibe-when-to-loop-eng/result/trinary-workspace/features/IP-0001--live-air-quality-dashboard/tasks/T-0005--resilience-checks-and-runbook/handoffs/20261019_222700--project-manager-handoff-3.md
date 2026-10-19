# Project-manager handoff: T-0005

- Task: [T-0005 — Resilience checks and local runbook](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:27:00Z
- Recipient: worker
- Event: reviewer changes requested
- Outcome: T-0005 moves from `review` to `changes_requested`; API/database integration and runbook were accepted, but actual rendered UI coverage is missing.

## Context passed

- Reviewer findings: [reviewer handoff 1](20261019_222627--reviewer-handoff-1.md).
- Current tests validate fresh DB, ingestion, response values, scheduler polls and retained readings; lines 84-88 of `server/integration.test.js` only regex-check `src/main.ts`, not rendered output.
- Full feature acceptance criterion 8 additionally requests a manual local run showing live values, history, and outage state through the local app; previous socket binding attempts failed with `EPERM`.

## Requested work

Add deterministic UI-level rendering evidence that exercises the real dashboard rendering path with a supplied API snapshot and verifies displayed values and failure/empty state; use the lightest existing tool/runtime and avoid unnecessary dependencies. Keep provider stubs. Update integration tests and handoff. The project manager will separately retry the approved local API/Vite/browser smoke using an environment that permits loopback binding; worker should not falsely claim it.
