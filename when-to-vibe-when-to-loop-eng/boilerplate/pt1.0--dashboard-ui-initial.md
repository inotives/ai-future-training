# Prompt: Build the Singapore Air Quality dashboard

You are working in my copy of the lesson's Vite + TypeScript boilerplate. First inspect the existing files, especially `src/data/temperature-fixture.ts`, `src/main.ts`, and `src/style.css`. Then replace the temperature demo with an air-quality mock dashboard directly in this working copy.

## Goal

Create a polished, responsive single-page application for exploring Singapore's regional air quality, focused on haze monitoring. This is the first mock-UI pass of a hands-on lesson. Make a useful starting experience that I can review and tweak with you afterward. The UI must clearly label all readings as synthetic demo data; do not imply that it reports current conditions or confirms a live haze event.

## Data sources to model

Use these official NEA data.gov.sg datasets to understand the measures and response fields:

- [Pollutant Standards Index (PSI)](https://data.gov.sg/datasets?agencies=National+Environment+Agency+%28NEA%29&resultId=d_fe37906a0182569d891506e815e819b7) — API endpoint: `https://api-open.data.gov.sg/v2/real-time/api/psi`.
- [PM2.5](https://data.gov.sg/datasets?agencies=National+Environment+Agency+%28NEA%29&resultId=d_e1058d6974c877257e32048ab128ad83) — API endpoint: `https://api-open.data.gov.sg/v2/real-time/api/pm25`.

Both datasets provide readings by Singapore region and are updated every 15 minutes. The PSI response includes `psi_twenty_four_hourly`; the PM2.5 response includes `pm25_one_hourly`. Keep PSI index values distinct from PM2.5 concentration in `µg/m³`.

## Use the existing starter

- Keep the Vite UI server on port `3555`.
- Use the existing TypeScript setup, daisyUI CDN styling, and installed Leaflet dependency.
- Replace the temperature fixture in your working copy with a small synthetic air-quality fixture based on the two APIs' documented shapes. Include all five regions, `regionMetadata` coordinates, PSI readings, PM2.5 readings, timestamps, and a few intentional gaps/stale values. Keep the fixture labeled as synthetic.
- Use local fixture data only: no backend, database, live API calls, or API keys.
- Do not add new dependencies.
- Do not edit the lesson's `boilerplate/` or reference `result/` folders.

## Dashboard content

- Header with the dashboard name, a visible synthetic-data label, and the latest fixture timestamp.
- Summary cards for the highest reported 24-hour PSI across regions, the region with that reading, the highest regional one-hour PM2.5 concentration, and data freshness. Keep the two measures and their units distinct.
- Singapore map using Leaflet, centered on Singapore. Show the five regions using the API's region metadata coordinates. Let the user switch the map between PSI and PM2.5 readings, and show the selected region's values and timestamp in a popup. Include OpenStreetMap attribution and follow its tile usage policy.
- A regional air-quality list with each region's latest PSI and PM2.5 readings. Selecting a region should update the map highlight and detail panel.
- Selected-region detail with the latest readings, units, timestamps, freshness, and a small trend chart. Show a visible gap where a reading is missing; do not interpolate it.
- Clear empty, stale, loading, and API-error presentations. Add a small demo control to switch between the fixture's normal, loading, and error states so these can be reviewed without a backend.

## Implementation guidance

- Keep the layout to one dashboard screen and make it usable on narrow screens as well as desktop.
- Use semantic HTML, readable contrast, keyboard-accessible controls, and clear focus states.
- Keep the chart lightweight; use SVG or CSS instead of adding a charting package.
- Base freshness on a fixed fixture reference time so stale examples are repeatable.
- Use neutral value-based styling unless the official sources provide a directly applicable category scale. Do not add health advice or interpret readings beyond the published data.
- Keep components and code straightforward. Do not build extra pages, authentication, settings, or features beyond this dashboard.

When finished, summarize the main UI interactions and list any assumptions or fixture limitations I should review. Keep the original boilerplate unchanged; make fixture changes only in my working copy.
