# PRANGARA — frontend handoff

> PRD v2 upgrade: see [HANDOFF_WEB.md](HANDOFF_WEB.md) and [FRONTEND-PRD-GAP.md](FRONTEND-PRD-GAP.md) for current scope, validation and backend blockers.

## Delivery and source of truth

The complete frontend lives in the requested `PrangaraFrontend` folder. The folder was empty before implementation, so no working frontend or backend code was replaced.

The supplied 56-page project report is the requirements reference. The user subsequently authorized a standalone frontend and will attach the backend. This deliverable therefore includes a functional local demo, typed integration boundary and proposed API contract. It does **not** claim verified integration with an unavailable engine.

User-facing branding is PRANGARA throughout.

## Stack

React 19, TypeScript 5.9 and Vite 7; Tailwind CSS 4 with custom semantic CSS and centralized tokens; Radix Dialog, Popover, Dropdown Menu and Tooltip; TanStack Query and Table; D3 and d3-sankey; Motion; Lucide icons; Zod.

Manrope Variable and Inter Variable are bundled from a local package. No runtime Google Fonts, CDN scripts, remote images, icon services or third-party decorative APIs are required.

GSAP, Lenis, Recharts, Zustand and a component theme kit were intentionally unnecessary: D3 owns geometry, Motion and CSS own transitions, and React/Query own state. This avoids overlapping libraries and preserves native dashboard scrolling.

## Run and build

Use Node.js 22.12+ and npm from this folder:

```powershell
npm ci
npm run dev
```

Local dashboard: http://127.0.0.1:5173/overview

```powershell
npm run lint
npm test
npm run build
npm run preview
```

Production output: `dist/`. Preview: http://127.0.0.1:4173.

All installed packages must be available before an offline demonstration. Once installed, the demo serves entirely from localhost. This is not an installable PWA; a local HTTP server must remain running. Opening `dist/index.html` directly through file:// is not supported.

## Application routes

| Route        | Purpose and interactions                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| /overview    | Financial opportunity first, footprint/range/scopes, top leaks, quick actions, portfolio curve, compliance overview                          |
| /assessment  | Seven-section input workflow, field units, dynamic activity streams, validation, JSON input export, engine submit in API mode                |
| /footprint   | Scope filters, interactive D3 Sankey, searchable/sortable stream inventory, factor drill-down, distinct intensity boundaries, biogenic memo  |
| /leaks       | Severity/rule/search filters, benchmark and structural indicators, detection explanations, related actions                                   |
| /actions     | All/cash-positive/quick-win/net-cost/capped/blocked views, category/search filters, sortable table, column controls, detailed business cases |
| /portfolio   | Three engine-owned portfolios, interactive MACC, returned financial/abatement totals, stream interaction illustration, JSON export           |
| /compliance  | Indicative CBAM exposure, explicit missing inputs, included/excluded boundaries, BRSR readiness/evidence and explanation drawers             |
| /methodology | Accounting basis, factor library, benchmarks, uncertainty, assumptions, limitations and provenance                                           |

The root redirects to overview; unknown routes have a recovery view. Query strings preserve scope and portfolio/action/methodology selections where applicable.

## Directory and component architecture

```text
src/
  app/App.tsx                  Providers, routes, lazy page imports
  api/client.ts                Centralized transport, mode selection, validation
  api/adapter.ts               Response mapping boundary for your real engine
  types/domain.ts              Canonical Zod schemas and inferred types
  data/                        Explicit static development fixtures
  hooks/useWorkspace.tsx       Queries, active plant, mutation, drawers and commands
  lib/format.ts                INR, Indian digit grouping, units and JSON export
  pages/                       Eight module entry points
  components/
    shell/                     Shell, navigation and command palette
    charts/                    Sankey, MACC, benchmark strip and tooltips
    tables/                    Reusable TanStack table
    actions/                   Intervention table definitions
    leaks/                     Leak cards and indicators
    drawers/                   Action, leak, stream, factor, calculation details
    ui/                        Reusable primitives, skeleton, error/empty states, KPI reveal
  styles/
    tokens.css                 Themes, semantic colors, spacing and motion tokens
    global.css                 Shell, typography and overview foundations
    components.css             Controls, tables, popovers, drawers and states
    charts.css                 SVG typography, scale guides, hover and tooltips
    pages.css                  Module layouts
    refinements.css            Responsive and final hierarchy adjustments
public/favicon.svg             Local PRANGARA monogram
work/generate_fixtures.py       Static fixture assembly record; not part of runtime
```

Provider hierarchy: ErrorBoundary → QueryClientProvider → MotionConfig → WorkspaceProvider → Router shell and lazy route pages. The shell owns the plant selector, keyboard palette, theme and sidebar controls; the shared drawer receives a typed discriminated record.

## State and data flow

TanStack Query caches sectors, selected sector, reference factors, health and demo assessment. Keys include the selected sector. Queries are fresh for five minutes, retry once and do not refetch on window focus. Assessment submission is a mutation. A successful result updates the active assessment and its sector context, closes the detail drawer and displays a completion notice.

React state owns filters, table sorting/visibility and form edits. Only theme, sidebar width and collapsed preference are persisted in localStorage. Plant data and form edits are held in memory. Input and portfolio JSON downloads are explicit actions. No analytics, browser storage of facility records, or unsolicited remote submission is installed.

See [API-CONTRACT.md](API-CONTRACT.md) for endpoints, units and canonical fields. Changing `VITE_DATA_MODE` to `api` activates HTTP transport. Map real responses in `adapter.ts` before using actual engine results. No carbon or financial calculation is duplicated in React.

## Demo behavior and evidence

The top-bar plant selector and Ctrl/Cmd+K palette can load ten report profiles. Tirupur is the detailed interaction demonstration; the other nine contain the report-known summary figures and intentional unavailable states. Refusal/cap examples are available for relevant sectors.

The textile fixture preserves report headline figures but uses illustrative granular streams, economics, benchmarks and chart geometry. Read [FIXTURE-PROVENANCE.md](FIXTURE-PROVENANCE.md) for precise distinctions. Full reference libraries, original demo payloads and current regulatory prices were not supplied.

The input form in demo mode validates and exports a profile. It does not claim to calculate a fresh assessment. In API mode the validated profile is submitted to POST /assess.

## Design system and changes

The visual hierarchy leads with annual rupee benefit, then capital/payback and carbon implications. Near-black neutral surfaces, fine borders, violet interactions, cyan positive states and warm orange warnings establish the PRANGARA identity. There are no decorative sustainability illustrations or generic chat widgets.

Edit `src/styles/tokens.css` for:

- Dark/light colors: background, sidebar, surfaces, text, borders and accent.
- Scope colors: warm brown for Scope 1, lavender for Scope 2, teal for Scope 3.
- Severity and positive/negative financial statuses.
- 4–64px spacing scale, standard radius, sidebar width, duration and easing.

Typography uses locally bundled Manrope headings and Inter UI text, tabular numeric figures and Indian financial formatting. Layout spacing is defined in semantic stylesheet rules; adjust the relevant module rule alongside the shared tokens rather than applying a global scale indiscriminately.

Breakpoints emphasize 1920px presentation screens, 1440/1280px laptops, 1024px tablets and a compact 390px monitoring layout. Tables and analytical charts use internal scrolling at narrow widths. The sidebar can be collapsed or resized with pointer drag or left/right arrow keys.

Branding entry points: shell wordmark, `public/favicon.svg`, `index.html` title/description and document headings. Keep backend identifiers intact unless your integration requires a mapping.

## D3 visualization architecture

D3 produces deterministic geometry; React renders SVG and handles selected/focused records. Calculations that position a point, scale a ribbon or accumulate bar offsets are presentation operations, not replacements for engine calculations.

### Sankey

`SankeyChart.tsx` clones the canonical nodes/links before d3-sankey mutates layout. IDs join streams to scopes and scopes to total. Scope ordering and descending source value keep the largest streams legible; source labels occupy a dedicated column. Link widths use returned positive annual tonnes, with a minimum visual stroke for discoverability. Negative-factor credits remain in the reference/inventory boundary and are not rendered as invalid negative Sankey ribbons.

Hover/focus highlights relationships and reveals stream facts. Stream selection opens the trace drawer; scope selection filters the inventory. The textual inventory remains an accessible alternative. Biogenic emissions are a separate memo and are not added to the Sankey total.

### MACC

`MaccChart.tsx` uses the selected portfolio's supplied curve. A linear x-scale places each contiguous bar using its de-rated abatement width; the y-scale uses supplied INR/tCO₂e LCOA. Negative values extend below the visible zero line; positive values extend above it.

Extreme heights are clipped to a robust 8th–92nd percentile display range with padding, while the true value remains in the tooltip, accessible name and action drawer. Dashed edges and a marker disclose clipping. The chart never clamps or changes the underlying action value.

Hover/focus dims unrelated bars. Click, Enter or Space opens the action. Selected highlighting persists. The selected portfolio's totals are displayed directly from its payload.

### Benchmarks and interaction

BenchmarkStrip positions returned percentiles using a D3 linear scale. It does not infer a distribution or calculate a percentile. Structural hotspots use footprint-share scale labels, avoiding a false peer comparison.

The electricity interaction panel compares standalone and returned de-rated widths. Its denominator is used solely to normalize the visual track. All actual reductions and economics remain supplied data.

## Motion and accessibility

Motion handles chart entrance/selection, benchmark markers, notifications and KPI display interpolation. CSS handles hover, route reveal, popover and drawer transitions. KPI count-up lasts 650ms and is remembered per assessment for the session; repeated navigation does not replay a completed count.

Micro interactions use approximately 150ms, navigation approximately 220ms, drawers approximately 280ms and chart reveals approximately 450–650ms. There is no artificial assessment delay and no simulated backend progress.

MotionConfig respects the user's reduced-motion preference. CSS disables transitions/animation for the same preference. Native scrolling remains intact. Radix supplies modal focus trapping and Escape behavior; controls have visible focus, meaningful labels and keyboard alternatives. Collapsed navigation retains accessible names. Charts expose text descriptions and interactive SVG labels; table and drawer detail supplement the graphic.

## Adding features

To add a module:

1. Add a small page under `src/pages`.
2. Lazy-import and register it in `src/app/App.tsx`.
3. Add its navigation item in `components/shell/navigation.ts`; the palette uses that configuration.
4. Reuse PageHeading, SectionHeading, DataTable, drawer records and theme tokens.
5. Add endpoint/schema/adapter changes centrally when new backend data is required.

To add an intervention visualization:

1. Extend the canonical Action schema only for real engine fields.
2. Populate it through the adapter.
3. Add a focused chart or detail component; use supplied values and semantic tokens.
4. Include a textual interpretation and keyboard interaction.
5. Add tests when a transformation or data-integrity invariant needs protection.

## Verification and limits

Automated checks: TypeScript production build; clean ESLint; 11 Vitest checks covering fixture schemas, known unknowns, inventory/Sankey consistency, portfolio totals, stream capacities, negative reference factors, input bounds and API pass-through/failure behavior.

Browser checks include all module navigation; plant switching and search; Ctrl/Cmd+K; invalid and valid input flows; dynamic fuel rows; leak and action filters; sortable/column-controlled tables; Sankey and factor drill-downs; positive clipped MACC values and keyboard activation; quick-win portfolio; compliance explanations; negative factor and state-grid filters; both themes; sidebar keyboard controls; 1920, 1440, 1280, 1024 and 390px layouts. Wide tables/charts intentionally scroll locally. This was not a full assistive-technology or cross-browser certification.

Important integration limits:

- The six endpoint paths and canonical schemas are proposed and unverified against your engine.
- Demo entry requires a supported initial sector key and a loaded assessment. See API-CONTRACT.md if the backend has no demo endpoint.
- No login, RBAC, tenancy, database persistence, backend service or regulatory filing was supplied or implemented.
- The factor catalogue is incomplete relative to the report, with missing values clearly disclosed.
- Nine sector profiles lack detailed assessment payloads; their starter form values are illustrative.
- Report compliance formulas are screening explanations. There is no current legal-liability calculation or external assurance.
- The report describes more interventions than the 21 detailed textile examples available in this development fixture.
- Cross-stream interaction remains an explicitly disclosed limitation.
- Production SPA fallback, HTTPS and API routing are responsibilities of your hosting environment.
- The build may emit two upstream Zod/Rollup comment-annotation notices; they do not prevent compilation. No source error is suppressed to obtain a passing build.

## Installed package inventory

The exact pinned package list follows. `package-lock.json` locks transitive dependencies.

| Package                       | Version | Use                |
| ----------------------------- | ------- | ------------------ |
| @fontsource-variable/manrope  | 5.3.0   | Runtime            |
| @radix-ui/react-dialog        | 1.1.23  | Runtime            |
| @radix-ui/react-dropdown-menu | 2.1.24  | Runtime            |
| @radix-ui/react-popover       | 1.1.23  | Runtime            |
| @radix-ui/react-tooltip       | 1.2.16  | Runtime            |
| @tanstack/react-query         | 5.102.8 | Runtime            |
| @tanstack/react-table         | 8.21.3  | Runtime            |
| d3                            | 7.9.0   | Runtime            |
| d3-sankey                     | 0.12.3  | Runtime            |
| lucide-react                  | 1.45.0  | Runtime            |
| motion                        | 13.2.0  | Runtime            |
| react                         | 19.3.0  | Runtime            |
| react-dom                     | 19.3.0  | Runtime            |
| react-router-dom              | 7.18.3  | Runtime            |
| zod                           | 4.6.2   | Runtime            |
| @eslint/js                    | 10.0.1  | Build / validation |
| @tailwindcss/vite             | 4.3.3   | Build / validation |
| @types/d3                     | 7.4.3   | Build / validation |
| @types/d3-sankey              | 0.12.5  | Build / validation |
| @types/node                   | 22.20.2 | Build / validation |
| @types/react                  | 19.3.0  | Build / validation |
| @types/react-dom              | 19.3.0  | Build / validation |
| @vitejs/plugin-react          | 5.1.2   | Build / validation |
| eslint                        | 10.10.0 | Build / validation |
| eslint-plugin-react-hooks     | 7.1.1   | Build / validation |
| eslint-plugin-react-refresh   | 0.5.6   | Build / validation |
| globals                       | 17.12.0 | Build / validation |
| prettier                      | 3.9.6   | Build / validation |
| tailwindcss                   | 4.3.3   | Build / validation |
| typescript                    | 5.9.3   | Build / validation |
| typescript-eslint             | 8.70.0  | Build / validation |
| vite                          | 7.3.6   | Build / validation |
| vitest                        | 4.1.11  | Build / validation |

## Reference visual refresh

The supplied HTML and design specification informed the neutral dark theme, 48px Manrope headings, Inter controls, 14–20px panel corners, subtle inner highlights, selective glass, and violet/cyan/orange analytical palette. User-authored sizing takes precedence over conflicting radius guidance in the reference DESIGN.md. No reference product copy, data or functionality was imported.

src/styles/visual-system.css applies consistent component treatment after structural styles. All semantic theme tokens live in tokens.css; both fonts are bundled locally. Scope 1 stays orange, Scope 2 is periwinkle, and Scope 3 is cyan. Existing data, API adapters, calculations and chart geometry were preserved.

Additional runtime dependency: @fontsource-variable/inter 5.3.0.
