# Complete Feature Catalogue

Every shipped capability, what it does, and where it lives. ✅ built and verified · 🔸 partial · ⬜ not built.

---

## 1. Assessment engine

| # | Feature | Status | Where |
|---|---|---|---|
| E1 | Scope 1/2/3 inventory per GHG Protocol Corporate Standard | ✅ | `engine/footprint.py` |
| E2 | Uncertainty bands (low/base/high) carried through **every** operation to the headline | ✅ | `engine/factors.py` `Band` |
| E3 | Unit resolution read from each factor's own unit string; unknown units **raise** rather than silently mis-convert | ✅ | `factors.py` `_numerator_multiplier` |
| E4 | State-level Indian grid factors (15 states, 0.48–0.88 tCO₂e/MWh) | ✅ | `factors.py` `grid_factor` |
| E5 | Thermal fuels aggregated to one addressable stream; **diesel held separate** (it is genset electricity, not process heat) | ✅ | `footprint.py` |
| E6 | Biogenic CO₂ computed as a memo line and **excluded** from Scope 1 | ✅ | `footprint.py` |
| E7 | Dual intensity bases — gate-to-gate benchmarked, cradle-to-gate reported only | ✅ | `footprint.py` |
| E8 | Stream-level decomposition with share, activity quantity and factor source | ✅ | `footprint.py` `Stream` |

## 2. Leak-point detection

| # | Feature | Status | Where |
|---|---|---|---|
| L1 | **Rule 1 — benchmark breach**: intensity above sector p75 | ✅ | `engine/leaks.py` |
| L2 | **Rule 2 — material concentration**: >15% of footprint *and* above median | ✅ | `leaks.py` |
| L3 | **Rule 3 — structural hotspot**: >25% of footprint with no benchmark (catches Scope 3 dominance an energy-only tool misses) | ✅ | `leaks.py` |
| L4 | Severity scoring weighted by stream share → critical/high/moderate/watch | ✅ | `leaks.py` `_severity` |
| L5 | Peer percentile by piecewise-linear interpolation, clamped 1–99 | ✅ | `leaks.py` `_percentile` |
| L6 | `gap_to_median` — tonnes recoverable by reaching sector median | ✅ | `leaks.py` |
| L7 | One finding per stream even when benchmarked on two bases | ✅ | `leaks.py` `seen` guard |
| L8 | Benchmark override injection + provenance passthrough | ✅ | `leaks.py`, `assess.py` |

## 3. Circular intervention recommender

| # | Feature | Status | Where |
|---|---|---|---|
| R1 | 30-intervention library across energy / material / process / waste / logistics | ✅ | `data/interventions.json` |
| R2 | Sector applicability matching | ✅ | `engine/macc.py` |
| R3 | **Blocking** — evaluated then refused with a stated reason (pharma rPET, ceramics briquette) | ✅ | `macc.py` `BLOCKED` |
| R4 | **Sector caps** — allowed at reduced share with reason (food rPET 35%, auto steel 45%) | ✅ | `macc.py` `SECTOR_CAPS` |
| R5 | **Physical blend ceilings** per intervention (recycled cotton 25%, alu 70%, steel 80%) | ✅ | `interventions.json` `max_substitution_pct` |
| R6 | Substitution capped at tonnage actually purchased | ✅ | `macc.py` `_evaluate` |
| R7 | Per-card confidence, difficulty 1–5, disruption days, evidence, caveats | ✅ | `interventions.json` |
| R8 | Plain-language physical statement of what changes | ✅ | `macc.py` `_physical_saving_note` |

## 4. Economics

| # | Feature | Status | Where |
|---|---|---|---|
| C1 | Capex **annualised** by capital recovery factor, never charged wholly to year one | ✅ | `engine/constants.py` |
| C2 | `LCOA = (CRF·capex + Δopex − saving) / abatement` | ✅ | `macc.py` |
| C3 | **Five savings models** — `avoided_purchase`, `tariff_delta`, `fuel_switch`, `price_delta`, `none` | ✅ | `macc.py` |
| C4 | Fuel switch correctly returns a **net cost** where the replacement fuel is dearer | ✅ | `macc.py` |
| C5 | **Interaction de-rating** — each intervention applies to the residual stream in MACC order | ✅ | `macc.py` `recommend` |
| C6 | Standalone *and* de-rated abatement both reported | ✅ | `macc.py` |
| C7 | Simple payback, NPV over asset life, cash-positive flag | ✅ | `macc.py` |
| C8 | Banded capex scaling by plant size (not linear) | ✅ | `constants.py` `size_multiplier` |
| C9 | Three portfolios — `all`, `cash_positive_only`, `quick_wins` | ✅ | `macc.py` `_portfolio_stats` |
| C10 | User-overridable tariff and cost of capital | ✅ | API + UI |

## 5. Compliance

| # | Feature | Status | Where |
|---|---|---|---|
| K1 | CBAM indicative exposure, apportioned by EU export share | ✅ | `engine/assess.py` |
| K2 | CBAM precursor emissions **excluded and declared excluded** | ✅ | `assess.py` |
| K3 | BRSR readiness checklist, explicitly not assurance | ✅ | `assess.py` |
| K4 | Per-sector regulatory flags (ZLD, EPR, hazardous waste, fly ash) | ✅ | `data/sectors.json` |

## 6. Visualisation

| # | Feature | Status | Where |
|---|---|---|---|
| V1 | Sankey stream → scope → total, ordered by scope then size to cut ribbon crossing | ✅ | `frontend/app.js` |
| V2 | Tail streams bundled into "N smaller sources" | ✅ | `app.js` |
| V3 | MACC — width = tonnes, height = ₹/tCO₂e, zero line emphasised | ✅ | `app.js` |
| V4 | MACC axis **clamped** to the informative band (8th–92nd percentile × 1.9) | ✅ | `app.js` |
| V5 | Off-scale bars dashed + counted, so a clipped bar never reads as its true value | ✅ | `app.js` |
| V6 | Leak cards with inline peer-distribution strip (p50, p75, you) | ✅ | `app.js` |
| V7 | Expandable working on every recommendation row | ✅ | `app.js` `detail()` |
| V8 | "Considered and rejected" panel | ✅ | `app.js` `renderRefusals` |
| V9 | Zero external dependencies — renders with networking off | ✅ | no CDN anywhere |
| V10 | Indian number formatting throughout (lakh / crore) | ✅ | `app.js` `inr()` |

## 7. Platform — accounts and persistence

| # | Feature | Status | Where |
|---|---|---|---|
| P1 | Register / login / logout, bcrypt hashing | ✅ | `backend/auth.py` |
| P2 | Server-side **revocable** sessions (not JWT) | ✅ | `auth.py` |
| P3 | Login message identical for wrong password and missing account (no enumeration) | ✅ | `auth.py` |
| P4 | Org kinds — plant / consultant / corporate | ✅ | `auth.py`, `db.py` |
| P5 | **Org-scoped authorisation enforced at the data layer**, not in routes | ✅ | `backend/repo.py` |
| P6 | Plant CRUD with soft archive | ✅ | `repo.py` |
| P7 | Versioned assessments, results **frozen** not recomputed | ✅ | `repo.py` |
| P8 | Plant identity taken from the record, not the submitted profile | ✅ | `repo.py` `run_assessment` |
| P9 | Denormalised intensity columns for fast corpus queries | ✅ | `db.py` |
| P10 | Anonymous sandbox remains fully stateless | ✅ | `app.py` |

## 8. Implementation tracking

| # | Feature | Status | Where |
|---|---|---|---|
| T1 | One action row per recommendation, auto-seeded on assessment | ✅ | `repo.py` `_sync_actions` |
| T2 | Five statuses — recommended / planned / in_progress / done / rejected | ✅ | `repo.py` |
| T3 | Estimates refresh on reassessment; **status and actuals preserved** | ✅ | `_sync_actions` |
| T4 | Retires no-longer-applicable interventions *unless* already acted on | ✅ | `_sync_actions` |
| T5 | Actuals capture — abatement, capex, annual benefit, notes | ✅ | API + completion modal |
| T6 | `completed_at` set on entering `done`, cleared on leaving | ✅ | `repo.py` `update_action` |
| T7 | Realisation rate, abatement accuracy, capex accuracy | ✅ | `backend/benchmarks.py` |
| T8 | Row order held stable so rows don't jump under the cursor mid-edit | ✅ | `app.js` `S.actionOrder` |

## 9. Data flywheel

| # | Feature | Status | Where |
|---|---|---|---|
| F1 | Corpus percentiles from real assessments | ✅ | `benchmarks.py` |
| F2 | Shrinkage blending toward literature prior at `n/(n+8)` | ✅ | `benchmarks.py` |
| F3 | **A plant is never benchmarked against itself** (enforced in SQL) | ✅ | `_corpus_values` |
| F4 | **Only the latest assessment per plant counts** | ✅ | `_corpus_values` |
| F5 | Minimum corpus of 3 before blending begins | ✅ | `benchmarks.py` |
| F6 | Provenance returned with every benchmark; UI states which was used | ✅ | `leaks.py` + `app.js` |
| F7 | Corpus health panel — per-sector weight and status | ✅ | `/api/corpus` + portfolio |

## 10. Portfolio

| # | Feature | Status | Where |
|---|---|---|---|
| O1 | Org-wide footprint, Scope 3 share, cash-positive totals | ✅ | `repo.py` `portfolio` |
| O2 | Per-plant rows with latest headline and action counts | ✅ | `repo.py` `list_plants` |
| O3 | Realisation KPI — measured, not assumed | ✅ | portfolio view |
| O4 | Sector breakdown | ✅ | `repo.py` |

## 11. Reporting

| # | Feature | Status | Where |
|---|---|---|---|
| Y1 | Per-assessment PDF, 3 pages, all 7 sections | ✅ | `backend/report.py` |
| Y2 | MACC rendered **server-side as vector SVG** (no screenshot step) | ✅ | `report.py` `macc_svg` |
| Y3 | Graceful HTML fallback when no browser is available | ✅ | `report.py` `to_pdf` |
| Y4 | Combined 56-page project report from `docs/*.md` | ✅ | `build_report.py` |

## 12. Frontend shell

| # | Feature | Status | Where |
|---|---|---|---|
| W1 | Hash router — sandbox / auth / portfolio / plant | ✅ | `app.js` `route()` |
| W2 | Auth forms with inline validation errors | ✅ | `app.js` `initAuth` |
| W3 | Plant tabs — Assessment / Action tracker / History | ✅ | `app.js` |
| W4 | History with Δ versus previous assessment | ✅ | `app.js` `renderHistory` |
| W5 | Modal system for add-plant, assess and completion capture | ✅ | `app.js` `modal()` |
| W6 | Renderers shared verbatim between sandbox and plant view | ✅ | one `render()` |

---

## Not built — stated deliberately

| Gap | Why it matters | Priority |
|---|---|---|
| ⬜ Full activity-data intake form (fuels, materials, waste, freight) | Reassessment currently edits four fields; the rest come from the sector template | **Highest** |
| ⬜ Email verification, password reset | Account is only as recoverable as the password | High |
| ⬜ Rate limiting on auth | Brute force unthrottled | High before public deploy |
| ⬜ CSRF token | Mitigated by `SameSite=Lax` + JSON-only API, not eliminated | High before public deploy |
| ⬜ Bill OCR / DISCOM ingest | Manual entry is the real adoption barrier | High |
| ⬜ BRSR-format and CBAM working-sheet export | The paywall in the business model | Medium |
| ⬜ Vendor marketplace (recommendation → 3 quotes) | Lifts realisation rate | Medium |
| ⬜ Multi-user orgs, invites, roles | Consultancies have teams | Medium |
| ⬜ Outlier rejection in the corpus | One mis-keyed assessment shifts a small sector | Medium |
| ⬜ Schema migrations tool | Second schema change gets awkward | Low now |
| ⬜ Session pruning | `sessions` grows unbounded | Low |
| ⬜ ML on realisation outcomes | Needs volume first — see [`13-DATA-FLYWHEEL.md`](13-DATA-FLYWHEEL.md) §5.2 | Later, by design |

---

## Counts

| | |
|---|---|
| API routes | 20 |
| Engine modules | 6 |
| Platform modules | 5 |
| Indian sectors | 10 |
| Circular interventions | 30 |
| Emission factors | 31 + 15 state grids |
| Detection rules | 3 |
| Savings models | 5 |
| Refusal mechanisms | 3 |
| Tests | 20, all passing |
| Documentation files | 19 |
