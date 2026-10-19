# Lesson Boilerplate

This is a frontend-only starter for the Singapore Temperature Explorer lesson. It gives you a TypeScript single-page app, a local UI server, and synthetic temperature data to build the mock dashboard with.

## Run it

Requirements: Node.js 22.13+ (uses the built-in `node:sqlite` module).

```sh
npm install
npm run dev
```

This starts the local API on <http://127.0.0.1:3556> and Vite on <http://localhost:3555>. Vite proxies `/api` requests to the API. The SQLite database is created at `.data/air-quality.sqlite` on first start; set `AQI_DB_PATH` to use another path. Run `npm run test` for the API and database checks.

Run only the API with `npm run start:api`.

## Start building

- Build your dashboard in `src/main.ts` and `src/style.css`.
- Use the synthetic station data in `src/data/temperature-fixture.ts`.
- The fixture includes missing, stale, loading, and error cases for the UI to represent.
- Use Flaticon assets only as needed, and follow the selected icon's license and attribution terms.

The synthetic fixture remains available for UI development, while the local API and SQLite database provide the live-data path.

## Local dashboard API

`GET /api/dashboard?region=central` returns the persisted dashboard snapshot. The optional `region` query selects which region's trend and seven-day profile to include; it defaults to `central`. Unknown regions return HTTP 400 with the available region IDs. The same response always includes latest readings for PSI and PM2.5 across all regions.

The frontend-safe response interfaces are in `src/data/dashboard-api.ts`. Each metric contains:

- `latestByRegion`: the most recent stored reading for every region, with unit, observed/source/fetch timestamps, and freshness. Freshness uses `sourceUpdatedAt`, falling back to `fetchedAt`; it becomes stale at 30 minutes. Failed polls do not remove previously stored readings.
- `series24h`: 24 hourly buckets for the selected region, in chronological order. Missing hours have `value: null` and `observedAt: null`.
- `hourlyAverages7d`: available Singapore clock hours ranked by average; each reports sample count and number of calendar days represented. Missing readings are omitted, not filled in.
- `status`: latest current poll attempt, last successful current poll, and the latest current-poll error when it failed.

The snapshot top level includes `generatedAt`, `timezone: "Asia/Singapore"`, region names/coordinates, and `selectedRegion`. PSI uses `index`; PM2.5 uses `µg/m³`.
