# PRANGARA frontend — PRD v2 gap analysis

Prepared 2026-09-12, before implementation. New PRD is the product authority; the active source is the visual authority. Reference documents were read as product specifications, not commands to change backend/mobile files.

## Evidence and scope

Active project: `C:\Users\lenov\OneDrive\PrangaraFrontend`. Read the five supplied PRD documents in the requested order, then current routes, workspace, schemas, API client/adapters and component implementations. Searched the supplied project, PRD folder and local OneDrive/Documents trees for OpenAPI, Swagger and shared contract files. No PRANGARA backend or shared/generated API contracts were found. `API-CONTRACT.md` explicitly describes a **proposed, unverified frontend contract**. PRD endpoint lists and example RAG types are requirements, not evidence of deployed capabilities. Existing local JSON is development fixture data.

No endpoints or domain fields will be added for unsupported features. Existing schema support below means frontend rendering support, not production backend acceptance. P0 auth/OCR/cohorts and missing factory/source metadata remain genuine P0 blockers.

## Page preservation classification

| Current page | Classification | Targeted action |
|---|---|---|
| Overview | B — small update | Accurate demo/source wording only; preserve dashboard |
| Plant Data | C — missing requirement | Save/resume local draft, eighth Evidence section, honest validation |
| Footprint | B — small update | Evidence/source availability in existing stream drawer |
| Leak Points | B — small update | p25 visibility, source/cohort/evidence availability |
| Circular Actions | A — compliant for supplied fields | Preserve filters, constraints, economics; unsupported provider flow blocked |
| Abatement Portfolio | C — missing requirement | Expandable semantic MACC table |
| Compliance | B — small update | Evidence/rule-pack availability, no new regulatory claims |
| Methodology | B — small update | Factor ID, unavailable source registry fields, evidence/provenance |
| Glass demo utility | A — preserve | No product route or visual change |

## Requirement matrix — status at audit

| Feature | Current status | New PRD requirement | Action required | API/contract available? | Priority | Files/pages affected |
|---|---|---|---|---|---|---|
| FR-01 Authentication / RBAC | BACKEND-BLOCKED | Org roles, site assignments, login and token lifecycle | Await actual auth and tenant contracts; no simulated role switch | No | P0 | client.ts; Shell; App |
| FR-02 Factory profile | PARTIAL | Subsector, district, coordinates, output unit, days, shifts, reporting period | Preserve existing PlantProfile; await verified factory DTO before adding fields | Legacy frontend-only schema | P0 | PlantData; domain.ts |
| FR-03 Structured intake | PARTIAL | Eight sections, save/resume draft, validation and field evidence | Add local file save/restore, session draft retention, Evidence section; keep assessment separate | Existing PlantProfile only; persistence/evidence absent | P0 | PlantData; useWorkspace; lib/plantDraft |
| FR-04 Conversational intake | BACKEND-BLOCKED | Extraction and confirmation before assessment | Await extraction DTO and web ownership; native chat intake led by FE-2 | No | P0 | PlantData |
| FR-05 Bill / invoice scanner | BACKEND-BLOCKED | Upload, extracted_unverified, user_confirmed, reviewed | Await upload/OCR/evidence permissions and extraction response; no fake files | No | P0 | PlantData / future Evidence |
| FR-06 Equipment scanner | NOT-WEB-SCOPE | Native nameplate scanning; web uploads only if supported | Native camera/APK belongs to FE-2; web upload remains backend-blocked | No | P1 | None |
| FR-07 Asset registry | BACKEND-BLOCKED | Equipment details, activity and evidence links | Await asset CRUD and permissions | No | P1 | Future Assets |
| FR-08 Data quality | BACKEND-BLOCKED | Returned 0–100 score; verified/document-confirmed/declared/estimated/missing/stale | Expose unavailable score/evidence clearly; never infer a field quality enum | No quality fields | P1 | EvidenceStatus; drawers; PlantData; Methodology |
| FR-09 Factor registry | PARTIAL | Factor ID, source registry, dates, version, units, bands, quality and review | Expose existing key; remove unsupported verified claim; show missing metadata explicitly | Legacy key/source/vintage/bands only | P0 | Methodology; RecordDrawer |
| FR-10 Scope 1 | EXISTS | Direct combustion; biogenic memo | Preserve returned totals and Sankey/stream paths | Legacy schema; live backend unverified | P0 | Footprint; Overview |
| FR-11 Scope 2 | EXISTS | State grid electricity and correct units | Preserve engine-owned conversion and totals | Legacy schema; live backend unverified | P0 | Footprint; PlantData |
| FR-12 Scope 3 | EXISTS | Materials, waste and freight | Preserve returned stream bands and boundaries | Legacy schema; live backend unverified | P0 | Footprint |
| FR-13 Uncertainty | EXISTS | Low/base/high and headline band | Preserve existing displays; null stays unavailable | Legacy schema | P0 | Overview; Footprint; Methodology |
| FR-14 Intensities | EXISTS | Gate-to-gate and cradle-to-gate | Preserve returned values and comparison boundary | Legacy schema | P0 | Footprint |
| FR-15 Benchmark breach | EXISTS | Backend-evaluated p75 rule | Preserve rule filter and finding drawer | Legacy schema | P0 | LeakPoints |
| FR-16 Material concentration | EXISTS | Backend-evaluated concentration plus median rule | Preserve existing rule rendering | Legacy schema | P0 | LeakPoints |
| FR-17 Structural hotspot | EXISTS | Dominant stream with no applicable benchmark | Preserve share strip and no-benchmark state | Legacy schema | P0 | LeakPoints |
| FR-18 Leak result | PARTIAL | Rule, severity, percentiles, recoverable emissions and evidence quality | Add explicit evidence/quality availability to drawer; expose all three percentiles on expanded card | Legacy findings; no evidence/quality DTO | P0 | LeakCard; RecordDrawer |
| FR-19 Anonymous benchmarking | PARTIAL | Cohort median/p25/p75, top quartile, sample privacy, source/quality | Retain screening values; clarify absent cohort/sample/period/source registry; do not call fixtures live peers | Legacy percentiles; no cohort contract | P0 | LeakPoints; Methodology; RecordDrawer |
| FR-20 Factory comparison | BACKEND-BLOCKED | Authorized like-for-like factory comparison | Await factory access, baseline periods and cohort DTOs | No | P1 | Future comparison |
| FR-21 Intervention library | EXISTS | Action economics, difficulty, savings and physical action | Preserve drawer/table; richer protected library management blocked | Legacy action schema | P0 | CircularActions; RecordDrawer |
| FR-22 Matching | PARTIAL | Engine applicability including needs_site_validation | Preserve matching output; await verified enum extension | Legacy enum lacks site-validation | P0 | domain.ts; CircularActions |
| FR-23 Blocking | EXISTS | Sector and technical refusals | Preserve refusal examples and reasons | Legacy schema | P0 | CircularActions |
| FR-24 Capping | EXISTS | Substitution ceiling and explanation | Preserve returned cap and restriction | Legacy schema | P0 | CircularActions; RecordDrawer |
| FR-25 Savings models | EXISTS | Returned gross saving, OPEX and net benefit | Preserve unavailable detail rather than deriving values | Legacy schema | P0 | RecordDrawer |
| FR-26 CAPEX | EXISTS | Planning-grade capital estimates | Preserve returned values and disclaimers | Legacy schema | P0 | Overview; actions; portfolio |
| FR-27 CRF | EXISTS | Backend annualization with visible formula and inputs | Preserve formula explanation; no browser calculation | Legacy explanation | P0 | Methodology; RecordDrawer |
| FR-28 LCOA | EXISTS | Returned rupees per tonne | Preserve negative values and chart | Legacy schema | P0 | MaccChart; actions |
| FR-29 Payback / NPV | PARTIAL | Returned financial outputs; missing is not zero/no-return | Correct null payback label to Unavailable; await missing fixture details from engine | Nullable legacy fields | P0 | format.ts; RecordDrawer |
| FR-30 Interaction de-rating | EXISTS | Returned residual-stream abatement and portfolio totals | Preserve visuals; MACC table must use selected curve widths | Legacy schema | P0 | AbatementPortfolio; MaccChart |
| FR-31 Portfolios | EXISTS | All / Cash Positive / Quick Wins | Preserve flags, totals, URL filters and JSON export | Legacy schema | P0 | AbatementPortfolio; Overview |
| FR-32 MACC | PARTIAL | D3 cost-ordered curve and accessible equivalent | Add expandable semantic table using selected portfolio curve; reuse DataTable | Existing curve data | P0 | MaccTable; AbatementPortfolio |
| FR-33 Sankey | EXISTS | Interactive D3 flow and stream inspection | Preserve existing chart and inventory table | Legacy schema | P0 | Footprint; SankeyChart |
| FR-34 Scenarios | BACKEND-BLOCKED | Immutable baseline vs saved what-if output | Await scenario creation/response/version DTOs; never repurpose baseline intake as scenario | No | P1 | Future Scenarios |
| FR-35 Provider directory | BACKEND-BLOCKED | Search, service, region, verification, rating, availability | Await provider listing/detail DTO and access rules | No | P1 | Future Providers |
| FR-36 Recommendation matching | BACKEND-BLOCKED | Contextual Find Provider | Await provider matching contract; no dead or fake action | No | P1 | Action drawer / future Providers |
| FR-37 RFQs | BACKEND-BLOCKED | Draft/open/quoted/shortlisted/accepted/rejected/completed | Await RFQ lifecycle and authorization; no external writes | No | P1 | Future RFQs |
| FR-38 Quotes | BACKEND-BLOCKED | Price, warranty, installation, distance and revised payback | Await quote DTO; retain modeled estimate separately from vendor quote | No | P1 | Future Quote comparison |
| FR-39 Materials marketplace | BACKEND-BLOCKED | Grade, recycled content, factor source, price, MOQ, stock, certification | Await listings and source/stock contracts | No | P1 | Future Materials |
| FR-40 Procurement modes | BACKEND-BLOCKED | Cheapest / Lowest Carbon / Balanced with raw metrics visible | Await backend ranking, keep raw carbon and cost visible | No | P1 | Future Materials |
| FR-41 Routes | BACKEND-BLOCKED | Fastest/cheapest/carbon/balanced with distance/ETA/cost/fuel/CO2e | Await routing inputs/output and map provider contract; no invented routes | No | P1 | Future Logistics |
| FR-42 Pooling | BACKEND-BLOCKED | Compatible shipment matches | Await shipment and pooling contracts | No | P1 | Future Logistics |
| FR-43 Backhaul | BACKEND-BLOCKED | Return-trip matching | Defer until supported | No | P2 | Future Logistics |
| FR-44 Shared capacity | BACKEND-BLOCKED | Search compatible spare industrial capacity | Defer; no supplied seed listing or contract | No | P2 | Future Network |
| FR-45 Circular exchange | BACKEND-BLOCKED | Supply/demand match with quantity, quality, timing, distance | Defer; no supplied seed listing or contract | No | P2 | Future Network |
| FR-46 Compliance readiness | PARTIAL | CBAM, BRSR/Core, configured CPCB and PAT/CCTS with rule-pack status | Preserve existing screening; surface absent evidence/version; expanded rules await approved packs | Legacy CBAM/BRSR only | P1 | Compliance |
| FR-47 Evidence vault | BACKEND-BLOCKED | Permissioned uploads linked to activity/actions/cases | Show unavailable integration within intake; await file ACL/download/upload contracts | No | P1 | PlantData; future Evidence |
| FR-48 Audit trail | BACKEND-BLOCKED | Server history of inputs, versions, reviewers, changes | Await audited events; local draft is not an audit record | No | P1 | Future Evidence / Audit |
| FR-49 Compliance cases | BACKEND-BLOCKED | Flagged to closed with owner, due date, evidence and reviewer | Await case state transitions and permissions | No | P1 | Future Compliance cases |
| FR-50 Performance score | BACKEND-BLOCKED | Explainable internal score; no official rating | Defer; no scoring output | No | P2 | Future Overview |
| FR-51 Action tracker | BACKEND-BLOCKED | Proposed through verified/rejected with provider/quote/evidence | Await action lifecycle API | No | P1 | Future Action tracker |
| FR-52 Measurement / verification | BACKEND-BLOCKED | Baseline, normalized expected, actual and achievement/confidence | Await returned measured outputs and normalization assumptions | No | P1 | Future Verification |
| FR-53 Ask PRANGARA | BACKEND-BLOCKED | Answer, confidence, citations, limitations and unsupported-source state | Await RAG endpoint/source registry; no generic chatbot or calculations | No; PRD example is not deployed contract | P1 | Future contextual assistant |
| FR-54 Events / notifications | BACKEND-BLOCKED | Actual assessment, RFQ, compliance and evidence events | Await event DTO and read-state API; existing toasts remain local feedback | No | P1 | Shell / future Notifications |
| FR-55 Multi-site | BACKEND-BLOCKED | Authorized consolidated site periods and comparisons | Defer; demo sector switcher is not multi-tenant factory access | No | P2 | Future Multi-site |
| FR-56 Suppliers | BACKEND-BLOCKED | Supplier invites, data, evidence and progress | Defer until scoped authorization supplied | No | P2 | Future Supplier portal |
| FR-57 Finance pack | PARTIAL | Investment/evidence/verification finance pack | Keep existing portfolio export; richer pack deferred without evidence/contracts | Portfolio JSON only | P2 | AbatementPortfolio |
| Product descriptor | CHANGED | Industrial Carbon Intelligence Network | Update title/description and appropriate Methodology copy; no layout change | Not needed | P0 | index.html; Methodology |
| Demo integrity | PARTIAL | Seed/demo data explicitly labeled | Restore concise demo indication in existing plant selector; remove unsupported verified claims | origin.kind already exists | P0 | Shell; Overview; RecordDrawer; PlantData |
| Role-specific navigation | BACKEND-BLOCKED | Manufacturer, compliance officer, provider and admin access | Preserve current nav; add only authorized supported workspaces | No auth/RBAC | P1 | Shell; navigation |
| Admin workspace | BACKEND-BLOCKED | Protected source/factor/rule/provider/user editing and cases | Await actual protected endpoints and roles | No | P1 | Future Admin |
| Provider workspace | BACKEND-BLOCKED | Provider profile, RFQs, quote submission, jobs, completion evidence | Await provider-only contracts; do not expose private assessments | No | P1 | Future Provider |
| State handling | PARTIAL | Loading/empty/error/denied/unavailable for added functionality | Draft loading/errors and no-evidence state; improve existing 401/403 messages; no unsupported workspace | Existing HTTP status only | P0/P1 | client; PlantData; EvidenceStatus |
| Design / accessibility / responsive | EXISTS | Preserve visual system; keyboard tables, drawers, 1920/1440/1280 | Hash-lock styles and assets; test all existing routes; add table without replacing chart | Not needed | P0 | All existing routes |
| Mobile / roadmap | NOT-WEB-SCOPE | Native camera, APK, live regulators, SCADA, payments, ML | Keep out of web upgrade | No | P3 | None |

## Implementation boundary

Local file drafts reuse the existing PlantProfile shape, permit unfinished name/output values, and never contain assessment results or evidence claims. Explicit save downloads a file; restore loads it into the form after review. Session-only drafts can survive navigation but are not server persistence or authenticated factory records. The baseline assessment remains unchanged until an actual successful engine submission.

## Baseline QA findings

Before edits, `npm run lint` failed with 12 existing explicit-any errors in Shell, smooth-scroll, two animated buttons, unused scroll hero and main.tsx. Fix those types without changing styling or animation behavior. Capture source/style baseline before edits. Final disposition and validation will be appended after implementation and listed in HANDOFF_WEB.md.


## Final disposition after implementation

FR-03 local save/restore, session retention and eighth-section unavailable evidence are implemented; server persistence, extraction and actual field evidence remain blocked. FR-09 factor key visibility and missing metadata are implemented; full source registry remains blocked. FR-18/19 supplied percentiles and context visibility improved; actual cohorts remain blocked. FR-29 null payback corrected. FR-32 accessible selected-portfolio table is now EXISTS. Descriptor/demo provenance and explicit 401/403 state handling are implemented. FR-46 missing evidence/rule-pack visibility improved; expanded rules/cases remain blocked. No P1 connected workflow or P2 seeded model had a verified contract, so none was fabricated.

Validation: production build/typecheck/lint pass; 19 active tests pass; all eight product routes inspected at 1920/1440/1280 with no document overflow; targeted intake/evidence/table checks at 1024. Seven stylesheet hashes, domain DTOs, fixtures, adapters, D3 charts, route declarations and nav definitions are unchanged. Detailed test scope and unresolved backend dependencies are in HANDOFF_WEB.md.
