# Singapore Air Quality Dashboard

This project displays PSI and PM2.5 observations for Singapore's five regions. The local Node API stores readings in SQLite, while the Vite frontend refreshes the dashboard from that API.

## Run it

Requirements: Node.js 22.13+ (uses the built-in `node:sqlite` module) and npm.

```sh
npm install
npm run dev
```

This starts the local API on <http://127.0.0.1:3556> and Vite on <http://127.0.0.1:3555>. Open <http://127.0.0.1:3555>. Vite proxies `/api` requests to the API. SQLite is created at `.data/air-quality.sqlite` on first start and migrations run automatically; set `AQI_DB_PATH` to store it elsewhere. Run `npm test` and `npm run build` for deterministic checks.

Run only the API with `npm run start:api`.

To use non-default ports, set `API_PORT` and `VITE_PORT` when starting `npm run dev`. Useful API-only settings are `AQI_BACKFILL_DELAY_MS` (default 2000) and `AQI_REQUEST_TIMEOUT_MS` (default 10000). The upstream API key is optional; if provided, set `DATA_GOV_SG_API_KEY` in the environment. Do not put secrets in tracked files.

On startup, the service checks both current feeds once, then backfills the latest 30 Singapore calendar days for PSI and PM2.5. If the dashboard opens while that one-time poll is running, it briefly retries database snapshots until the check finishes or readings appear; these retries do not request provider data. A shared sliding-window limiter caps all data.gov.sg request attempts across both feeds, current checks, backfill, and retries at six per 10 seconds. Historical requests also have a two-second pacing delay by default. Successful date/metric runs are recorded so a later start resumes missing or failed dates and skips completed ones. Use the dashboard's **Auto refresh** switch to opt in to an immediate current check followed by checks every five minutes while the page stays open. The preference is stored in this browser and resumes with an immediate check after reload. The dashboard fetches a new API snapshot when stored observations change; identical checks update only the last-check status without replacing the dashboard panels. Provider errors remain visible while stored observations are retained.

## Local dashboard API

`GET /api/dashboard?region=central` returns the persisted dashboard snapshot. The optional `region` query selects which region's trend and seven-day profile to include; it defaults to `central`. Unknown regions return HTTP 400 with the available region IDs. The same response always includes latest readings for PSI and PM2.5 across all regions.

`POST /api/poll-current` asks the local service to check both current feeds. It returns `changed`, `recordsWritten`, `checkedAt`, and any provider error details. The dashboard calls this endpoint only when its Auto refresh switch is on. Concurrent calls share the same in-flight poll and all provider attempts still pass through the shared request limiter.

The frontend-safe response interfaces are in `src/data/dashboard-api.ts`. Each metric contains:

- `latestByRegion`: the most recent stored reading for every region, with unit, observed/source/fetch timestamps, and freshness. Freshness uses `sourceUpdatedAt`, falling back to `fetchedAt`; it becomes stale at 30 minutes. Failed polls do not remove previously stored readings.
- `series24h`: 24 hourly buckets for the selected region, in chronological order. Missing hours have `value: null` and `observedAt: null`.
- `hourlyAverages7d`: available Singapore clock hours ranked by average; each reports sample count and number of calendar days represented. Missing readings are omitted, not filled in.
- `status`: latest current poll attempt, last successful current poll, and the latest current-poll error when it failed.

The snapshot top level includes `generatedAt`, `timezone: "Asia/Singapore"`, region names/coordinates, and `selectedRegion`. PSI uses `index`; PM2.5 uses `µg/m³`.

## Recovery

- If the dashboard shows a provider error, check the API is reachable at <http://127.0.0.1:3556/api/health> and restart `npm run dev` if it is not. Existing readings remain available while a feed is failing.
- If the API reports a database or migration error, stop the app and confirm the `.data` directory is writable and the disk has space. Restarting retries unapplied migrations and incomplete backfill dates.
- To start over with an empty local database, stop the app and remove `.data/air-quality.sqlite` plus its `-shm` and `-wal` companions if present. The next start creates a fresh database and repeats the initial poll and 30-day backfill. This permanently removes local history.
- Use `npm test` and `npm run build` after a recovery to check the local installation.

The integration tests use a temporary SQLite database and stubbed provider responses. They cover the fresh database → ingestion → dashboard API path, opt-in immediate and five-minute refresh lifecycle, preference persistence across reload, changed/no-change checks, last-known readings after provider failure, the UI's live data/error binding, and unknown-region responses without requiring a network listener.
