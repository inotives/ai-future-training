# Claude Code Workshop: Vibe Coding and Loop Engineering

## Purpose

Help the Data Engineering team get started with Claude Code by showing two ways to work with it:

- **Vibe coding** for fast exploration when a visible result and quick feedback are useful.
- **Loop engineering** for changes that need clear requirements, correctness, implementation checkpoints, and review. The workshop uses the Trinary Agents workflow for this part.

The main lesson is that these approaches can be stages of one effort: explore an experience quickly, then use a structured loop to make the behavior dependable.

## Learning outcomes

By the end, participants should be able to:

- Build and refine a small mock UI with Claude Code.
- Identify assumptions hidden in the mock data and interactions.
- Decide when the work needs a planned implementation loop.
- Use Trinary Agents to break a feature into dependency-aware implementation and review tasks.
- Explain how the live data source can be delayed, incomplete, or corrected.


## Technology stack

- **UI:** one TypeScript single-page app with a single dashboard screen, styled with [daisyUI via CDN](https://daisyui.com/?lang=en) and a [Leaflet](https://leafletjs.com/) map for station locations. Use OpenStreetMap tiles with visible attribution and follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
- **Icons:** [Flaticon](https://www.flaticon.com/). Download selected icons into the project and follow their license and attribution terms; use the downloaded assets rather than treating Flaticon as a runtime CDN.
- **Language:** TypeScript for both the UI and API, running on Node.js.
- **Local API server:** a Node.js TypeScript server at `http://localhost:3554`.
- **Local UI server:** serve the single-page dashboard at `http://localhost:3555`; it calls the API at `http://localhost:3554`.
- **Database:** SQLite for simple local persistence where the lesson needs to store data.

## Demo concept: Singapore Temperature Explorer

Use NEA's [Air Temperature across Singapore dataset](https://data.gov.sg/datasets/d_66b77726bbae1b33f218db60ff5861f0/view). It contains minute-level, weather-station readings and the dataset is updated every five minutes. The real-time API returns station metadata and timestamped readings, including station IDs, names, coordinates, and temperature values. See the [API example](https://data.gov.sg/datasets?page=8&resultId=d_66b77726bbae1b33f218db60ff5861f0&sidebar=true&topics=environment).

## Start from the boilerplate

Copy [`boilerplate/`](boilerplate/) into your own working folder, such as `my-result/`,

```
cp -R boilerplate toni-result
```

Then cd into the new folder you just copy from boilerplate.

follow its README to run the UI at `http://localhost:3555`. It provides a TypeScript SPA scaffold and synthetic fixture data, but no API server or finished dashboard. Build the mock dashboard in your copy during the vibe-coding phase;

the `result/` folder is just the expected-outcome as reference.

### What next

On a new terminal, cd into the folder you just copied from boilerplate, start your coding agent `claude` or `codex`.
You agent now will treat this a folder as its workspace in this session.

With this, you can start vibe coding.
Tell your agent to read the README.md to understand what we are building. basically is what is outline in next section.


### Dashboard idea

Build a single-page application (SPA) for a station-level temperature dashboard with:

- **Overview:** hottest and coolest reporting stations, current temperature range, and latest reading time.
- **Station explorer:** a sortable list or map of stations, colored by temperature.
- **Station detail:** selected station name, location, current value, and a recent trend chart.
- **Data health:** freshness, delayed or missing readings, and API error state.

Label values as station readings. Avoid presenting them as a single exact temperature for all of Singapore: local station conditions can influence measurements. The dataset documentation also notes that gaps can occur and data can be corrected later.

### Mock data for the first phase

The boilerplate includes a small, static synthetic fixture with several stations, timestamps, temperature values, and intentional edge cases:

- One station with no current reading.
- A stale reading.
- A missing point in one station's trend.
- A loading and an API error state.

Use synthetic values and label them as demo data. This keeps the first phase safe to iterate on and makes the UI states reproducible.

## Workshop flow

Suggested duration: 75–90 minutes; adjust to the available session time.

### 1. Frame the two approaches

Introduce the decision rule:

- Use vibe coding when scope is small, feedback is quick, and mistakes are cheap to inspect and discard.
- Use loop engineering when the change crosses components or data contracts, needs persistent data, or requires stronger evidence and review.

### 2. Vibe-code the mock UI

Ask your coding agent to build the dashboard using only the fixture. Iterate on the station list, selected-station detail, chart, and data-health presentation. Keep this phase focused on information hierarchy and interaction rather than real API access.

At the end, review what the mock has clarified and what it has merely assumed. Capture the fields, user actions, and loading, empty, stale, and error states that the real implementation must support.

### 3. Make the transition explicit

Use a short checklist before changing modes:

- Are station identity, coordinates, temperature units, and timestamps understood?
- Does the API return every field the UI expects?
- How will the UI represent missing or stale readings?
- Do we need historical data, or is the latest reading enough?
- Does a backend or database have a clear purpose in this version?
- What evidence will show that the real UI matches the mock and handles source failures?

### 4. Loop-engineer the real integration with Trinary Agents

Start a Trinary Agents feature plan from the agreed UI and data contract. Approve the plan and task breakdown before implementation, then use worker and independent reviewer cycles.

A possible task breakdown is:

1. Inspect the live API contract and create representative fixtures.
2. Implement a source client and normalize station readings, timestamps, and units.
3. If historical queries are in scope, ingest and persist readings with an idempotent key such as station ID plus reading timestamp; account for source corrections.
4. Add a Node.js TypeScript API endpoint that returns the view the UI needs.
5. Connect the UI and implement loading, stale, missing, and error states.
6. Verify the end-to-end flow and have an independent reviewer check the implementation against the feature plan.

Keep database work optional unless the workshop goal includes history, repeatable analytics, or a DE ingestion path. A live latest-reading view can be served without persisting the data.

### 5. Compare the results

Discuss what the mock UI helped the team decide quickly, what assumptions changed after checking the API, and what the implementation loop added: explicit contracts, data handling, verification, and independent review.

## Data and API constraints

- The real-time endpoint is `GET https://api-open.data.gov.sg/v2/real-time/api/air-temperature`.
- Without an API key, the documented real-time API limit is **6 calls per 10 seconds**. The quota resets every 10 seconds; exceeding it returns `429`. Avoid rapid polling and cache results in the demo backend. See [data.gov.sg rate limits](https://guide.data.gov.sg/developer-guide/api-overview/api-rate-limits).
- The API can return the latest reading or accept a date/date-time query. Date-filtered requests may include a pagination token for subsequent pages.
- The dataset updates every five minutes even though its readings are described as minute-level.
- Gaps and later corrections are possible. Preserve source timestamps and make ingestion repeatable if data is stored.
- For the workshop prototype, use the unauthenticated endpoint only at a modest request rate. If the team later turns this into a production integration, review data.gov.sg's API key and rate-limit guidance.

## Success criteria

The workshop succeeds when participants can:

- Explain when they would start with a mock UI and when they would use a planned loop.
- Point out at least three assumptions or failure states in the temperature dashboard.
- Describe how the UI's needs map to the API and, if included, the database.
- See how Trinary Agents records scope, task dependencies, implementation handoffs, and independent review.

## References

- [Air Temperature across Singapore dataset](https://data.gov.sg/datasets/d_66b77726bbae1b33f218db60ff5861f0/view)
- [Real-time air temperature API example](https://data.gov.sg/datasets?page=8&resultId=d_66b77726bbae1b33f218db60ff5861f0&sidebar=true&topics=environment)
- [data.gov.sg API rate limits](https://guide.data.gov.sg/developer-guide/api-overview/api-rate-limits)
- [Trinary Agents skill](https://github.com/inotives/trinary-agents/tree/main/skills/trinary-agents)
