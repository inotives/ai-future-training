# Project-manager handoff: T-0004

- Task: [T-0004 — Bind the dashboard to live data](../README.md)
- Role: project-manager
- Timestamp (UTC): 2026-10-19T22:20:36Z
- Recipient: worker
- Event: reviewer changes requested
- Outcome: T-0004 moves from `review` to `changes_requested` for three concrete UI consistency/interaction defects.

## Context passed

- Reviewer findings and evidence: [reviewer handoff 1](20261019_222009--reviewer-handoff-1.md).
- Build and diff check passed; no browser/API smoke was possible because of local port `EPERM`, but this is not the basis for the requested changes.

## Requested work

1. Keep the selected region and region-specific trend/profile consistent if a region fetch fails: restore the response's region or suppress/mark mismatched aggregates until the selected region loads.
2. In the no-readings case, show upstream ingestion failure as well as the fact that no stored readings are available.
3. Preserve Leaflet map center and zoom through periodic and ordinary rerenders while updating values/markers.

Add or update focused coverage where practical; run build and relevant checks. If a loopback smoke can be performed after changes, include it; otherwise record the environment limitation precisely. Make no unrelated changes and append a fresh worker handoff.
