# Lesson Boilerplate

This is a frontend-only starter for the Singapore Temperature Explorer lesson. It gives you a TypeScript single-page app, a local UI server, and synthetic temperature data to build the mock dashboard with.

## Run it

Requirements: Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open <http://localhost:3555>.

## Start building

- Build your dashboard in `src/main.ts` and `src/style.css`.
- Use the synthetic station data in `src/data/temperature-fixture.ts`.
- The fixture includes missing, stale, loading, and error cases for the UI to represent.
- Use Flaticon assets only as needed, and follow the selected icon's license and attribution terms.

This starter does not include a backend or database. Keep the first version of the dashboard on fixture data; the lesson covers the live API integration later.
