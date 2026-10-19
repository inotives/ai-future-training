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

This starter does not include a backend or database. Keep the first version of the dashboard on fixture data; the lesson covers the live API integration later.
