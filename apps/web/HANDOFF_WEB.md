# PRANGARA web — PRD v2 upgrade handoff

Updated 2026-09-12. Active frontend: `C:\Users\lenov\OneDrive\PrangaraFrontend`.

This is an incremental upgrade of the approved frontend. It is not a full implementation of the expanded platform. P0 backend dependencies and all unsupported P1/P2 workflows remain explicitly blocked. Read `FRONTEND-PRD-GAP.md` for the complete FR-01–FR-57 audit prepared before implementation. This handoff supersedes the original report-based handoff for current v2 scope.

## 1. New requirements found

Authentication and tenant roles; expanded factory profiles; resumable eight-section intake; OCR; quality/evidence/source registries; anonymous cohorts and comparison; scenarios; providers and RFQs; quotes/materials/logistics; implementation and measured verification; compliance cases and rule packs; cited RAG; provider/admin workspaces; later network features.

## 2. Existing capabilities preserved

Overview economics and carbon ranges, Scope 1/2/3, Sankey and streams, intensities, all three leak rules, screening percentiles, intervention filters/economics, caps and refusals, three portfolios, D3 MACC, de-rating explanation, screening CBAM/BRSR, factor references, drawers, commands, theme/sidebar behavior and existing animated controls.

Every stylesheet matches the pre-change SHA-256 digest. Original colors, gradients, fonts, chart implementations, sidebar geometry, motion and design assets were retained. All eight product routes and the existing glass-demo utility remain in place. No new navigation entries or role-switch controls were introduced.

## 3. Features modified

- Plant Data: eighth Evidence section; explicit local draft-file save and restore with review/cancel; 1 MB bound; JSON/schema errors; session-only draft retention keyed by current assessment ID. Unfinished name/zero production drafts can be saved but must pass strict assessment validation before submission. Invalid final input returns to its section. Demo action now says Validate inputs and clearly explains that no new assessment was calculated.
- Footprint/leak drawers: evidence, field verification and quality availability. Expanded leak cards show p25/median/p75. Cohort sample, period and source metadata remain explicitly not supplied.
- Portfolio: expandable, keyboard-accessible MACC table using the selected curve's actual signed costs and portfolio widths. It changes with portfolio mode and opens the existing action drawer. No re-summing or economics calculations added.
- Methodology: factor-ID search and drawer display; absent publisher/version/date/grade/review/source-link fields; Evidence tab with origin/reference. Product descriptor updated to Industrial Carbon Intelligence Network.
- Compliance: expandable evidence/rule-pack availability; no new legal applicability or compliance claims.
- Trust copy: concise demo label in the existing plant selector; removed unsupported claims of factor verification or accounting-standard validation.
- Null payback now says Unavailable. Existing 401 and 403 HTTP responses receive distinct session/access errors without demo fallback.
- Fixed 12 pre-existing explicit-any lint errors with type annotations only. Decorative duplicate hover labels are hidden from screen readers while animations stay intact.

## 4. Pages / routes

No new routes. Enhanced `/assessment`, `/portfolio`, `/methodology`, `/leaks`, `/compliance` and existing stream/leak/factor drawers. Existing `/overview`, `/footprint`, `/actions` layouts retained.

## 5. New components and helpers

`EvidenceStatus.tsx`, `MaccTable.tsx`, local `plantDraft.ts`, and browser type declarations. Two new regression test files; HTTP access tests extended.

## 6. APIs used

No new endpoints. Existing client retains GET `/health`, `/sectors`, `/sector/{key}`, `/reference`, `/demo/{key}` and POST `/assess` relative to the configured API base. These are the existing frontend assumptions, not verified server contracts. Default demo mode performs no assessment-service requests. API mode has no fixture fallback.

## 7. Contracts / types

`src/types/domain.ts` and `src/api/adapter.ts` are unchanged. No backend payload fields, enums, endpoints, source IDs or quality scores were invented. Local draft parsing reuses PlantProfile with an unfinished-name/output allowance; this is a local file format, never a new API model. Browser declarations describe the existing Lenis instance and legacy navigation check.

## 8. Backend-blocked work

No PRANGARA backend, OpenAPI or shared/generated contracts were found in the supplied project, PRD folder or scoped local search. PRD endpoint lists are specifications, not evidence of implemented APIs.

P0 blockers: real login/RBAC and assigned factories; expanded profile fields and reporting periods; conversational/document extraction and confirmation; authenticated draft persistence; evidence linkage; complete factor/source registry; privacy-safe anonymous benchmark cohorts; site-validation applicability; real engine integration/acceptance.

P1 blockers: scenarios, asset registry, actual quality scores, upload/vault/ACLs/audit, compare factories, provider matching and detail, RFQs/quote acceptance and comparison, material listings/ranking, routing/pooling, implementation lifecycle, measured outcomes, reviewed compliance packs/cases, cited RAG, server events, provider/admin roles and protected editing. No unsupported workspace is presented as functioning.

## 9. P2 / P3 deliberately deferred

Backhaul, shared capacity, circular exchange, internal scores, multi-site/supplier programs and richer finance packs lack data/contracts. Retained existing portfolio JSON export. Live regulatory filing, SCADA, payments, native camera/APK and ML remain outside this web increment.

## 10. Changed files

- `src/api/client.test.ts`
- `src/api/client.ts`
- `src/components/drawers/RecordDrawer.tsx`
- `src/components/leaks/LeakCard.tsx`
- `src/components/shell/Shell.tsx`
- `src/components/tables/MaccTable.test.tsx`
- `src/components/tables/MaccTable.tsx`
- `src/components/ui/EvidenceStatus.tsx`
- `src/components/ui/UnseenSmoothScroll.tsx`
- `src/components/ui/flow-button.tsx`
- `src/components/ui/liquid-glass-button.tsx`
- `src/components/ui/scroll-hero-section.tsx`
- `src/hooks/useWorkspace.tsx`
- `src/lib/format.ts`
- `src/lib/plantDraft.test.ts`
- `src/lib/plantDraft.ts`
- `src/main.tsx`
- `src/pages/AbatementPortfolio.tsx`
- `src/pages/Compliance.tsx`
- `src/pages/LeakPoints.tsx`
- `src/pages/Methodology.tsx`
- `src/pages/Overview.tsx`
- `src/pages/PlantData.tsx`
- `src/types/browser.d.ts`
- `index.html` (descriptor), `package.json` (test script excludes source backups)
- `FRONTEND-PRD-GAP.md`, `HANDOFF_WEB.md`, README and original handoff cross-references
- Rebuilt `dist/`; ignored backup/check report in `work/prd-v2-baseline` and `work/prd-v2-verification.json`

## 11. Dependencies

None added or upgraded. `package-lock.json` unchanged. Test discovery now excludes `work/**` so the pre-change backup is not counted or run as active source.

## 12. Commands

Run from the active frontend folder:

```powershell
npm run dev
npm run build
npm run lint
npm test
```

Targeted Prettier formatting was run on changed source. Initial lint identified 12 pre-existing errors; final lint passes. An initial test run counted backup copies; the final script excludes these and runs only four active test files.

## 13–15. Build, types and tests

- Production build: PASS, `dist/` refreshed.
- Typecheck: PASS (`tsc -b`, first stage of build).
- ESLint: PASS, zero errors/warnings.
- Vitest: PASS, 19 tests across 4 active files.
- Regression coverage: all ten fixture schemas; null/signed data; Sankey balance; portfolio consistency; no browser assessment calculation; HTTP failures and contract mismatch; 401/403 preservation; draft round-trip, input units, mutation isolation, incomplete-input validation, malformed/oversized/incompatible files; selected MACC curve values, signed LCOA and empty states.
- Browser: all eight product routes checked at 1920×1080, 1440×1000 and 1280×900 without document overflow. Existing pages visually inspected at 1440. Evidence and expanded table checked at 1024×900. Navigation-retained draft did not change baseline. Demo validation and invalid-name recovery exercised. MACC all/quick-win modes (21/7 rows) and action drawer checked; factor-ID search and unavailable metadata checked; leak severity and capped filters checked.
- Styles/domain/fixtures/chart/nav checks: unchanged, recorded in `work/prd-v2-verification.json`.

## 16. Known limits and remaining acceptance

Full manufacturer login → provider → RFQ → implementation → measured outcome → cited RAG acceptance is blocked by missing backend capabilities, including P0 auth. No claim of completed production integration is made. Only returned/supplied fields can render.

Drafts are in memory during navigation and in an explicitly downloaded file after Save. Reload/close loses unsaved edits. They are not tenant-authenticated server records or audit evidence. Restore replaces the current input form only after the user reviews it; it does not replace the displayed assessment. File parser tests and visible file controls are verified; the native file chooser/download round-trip still needs a manual device check. Uploaded evidence is unavailable.

The existing API bootstrap requires a demo assessment before Plant Data mounts. Once actual factory/intake contracts arrive, implement authorized initial-profile loading rather than fabricate an assessment. Clear session drafts on the real auth/tenant lifecycle when integrated.

Vite hot updates to the context during editing produced transient WorkspaceProvider console errors; full navigations recovered, and the final route pass rendered successfully. Two existing Zod pure-annotation warnings remain in Rollup; build completes. Existing app includes external editorial-font links in index.html, unchanged by this upgrade. Native Android work remains separate.

## 17. Next safe frontend task

Inspect the real OpenAPI/generated contracts and redacted backend responses. Start with P0 auth, authorized factory bootstrap/profile fields, evidence and source/quality metadata; wire them at the existing API/adapter boundary and add contract fixtures. Then implement contextual provider matching, RFQ and tracker only when their tenant permissions and lifecycle endpoints are confirmed. Preserve this design and use the gap matrix to prevent speculative APIs.
