# PRANGARA frontend

> PRD v2 upgrade: see [HANDOFF_WEB.md](HANDOFF_WEB.md) and [FRONTEND-PRD-GAP.md](FRONTEND-PRD-GAP.md) for current scope, validation and backend blockers.

A React and TypeScript dashboard for industrial carbon intelligence, circular interventions, and investment decisions.

## Run locally

Use Node.js 22.12 or later and npm. All commands run from this folder.

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:5173/overview. The supplied project defaults to a fully local development demo. Dependencies must be installed once; fonts, icons, data and charts are then served locally.

## Connect your backend

Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_DATA_MODE=api
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://127.0.0.1:8077
```

Restart Vite. Inspect your actual engine payloads and map them in `src/api/adapter.ts` to the Zod schemas in `src/types/domain.ts`. These are **proposed frontend contracts**, not verified backend schemas. No backend repository was supplied.

Read [API-CONTRACT.md](API-CONTRACT.md) before connecting real data. API failures never fall back to fixtures.

## Build and verify

```powershell
npm run lint
npm test
npm run build
npm run preview
```

The build is in `dist/`. Preview runs at http://127.0.0.1:4173. Serve the build over HTTP, with SPA routing fallback and an API reverse proxy for a connected deployment.

## Handoff

- [FRONTEND-HANDOFF.md](FRONTEND-HANDOFF.md): architecture, routes, components, styling, motion, charts and known limitations.
- [API-CONTRACT.md](API-CONTRACT.md): integration steps, units and response contracts.
- [FIXTURE-PROVENANCE.md](FIXTURE-PROVENANCE.md): report values versus illustrative development data.

The textile demonstration has interactive detail. Nine other sectors preserve the headline results available in the project report. Missing analytical detail is shown as unavailable. Editing inputs in demo mode validates and exports the profile; it does not generate a new carbon assessment.
