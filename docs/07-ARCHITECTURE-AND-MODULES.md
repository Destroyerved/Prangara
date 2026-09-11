# Architecture and Modules

---

## 1. System shape

```
┌──────────────────────────────────────────────────────────────┐
│  BROWSER  — zero external dependencies, renders offline      │
│  index.html · styles.css · app.js                            │
│  hand-built SVG:  Sankey  +  MACC                            │
└───────────────────────────┬──────────────────────────────────┘
                            │  JSON over HTTP
┌───────────────────────────▼──────────────────────────────────┐
│  API  — FastAPI, stateless                                   │
│  /api/sectors  /api/sector/{k}  /api/reference               │
│  /api/assess   /api/demo/{k}    /api/health                  │
└───────────────────────────┬──────────────────────────────────┘
┌───────────────────────────▼──────────────────────────────────┐
│  ENGINE  — pure Python, no I/O beyond loading reference JSON │
│                                                              │
│   factors.py ──► footprint.py ──► leaks.py                   │
│       │              │                │                      │
│       └──────────────┴────► macc.py ──┴──► assess.py         │
│                                                              │
│   constants.py  — NCVs, tariffs, CRF, thresholds             │
└───────────────────────────┬──────────────────────────────────┘
┌───────────────────────────▼──────────────────────────────────┐
│  REFERENCE DATA  — JSON, editable without touching code      │
│  emission_factors.json · interventions.json · sectors.json   │
└──────────────────────────────────────────────────────────────┘
```

**Why stateless.** There is no database. The plant's data arrives in the request, is assessed, and is returned — it is never persisted. *"Where is the data stored?"* → *"Nowhere. Your process data never leaves the request."* That is a better answer for this user than an unused Postgres container, and it removes an entire class of privacy objection from a user who is genuinely sensitive about disclosing energy and material consumption.

---

## 2. Modules

### `constants.py` — the assumption surface
Every number the model leans on, in one file so it can be audited without reading the maths.

- **NCV table** — net calorific values, to express mixed fuels on a common GJ basis for benchmarking
- **`THERMAL_FUELS`** — deliberately excludes diesel, which in an Indian SME is genset electricity, not process heat
- **Financial defaults** — ₹8/kWh industrial tariff, 12% cost of capital (MSME term lending is ~11–14%)
- **`capital_recovery_factor(r, n)`** — `r(1+r)ⁿ/((1+r)ⁿ−1)`
- **`size_multiplier(revenue)`** — banded, not linear: a leak survey at a ₹100 Cr plant is not ten times the job it is at ₹10 Cr

### `factors.py` — units and uncertainty
- **`Band`** — a `(base, low, high)` triple with arithmetic that keeps the band. Negative scaling correctly flips which end is the low end.
- **`FactorDB`** — flattens all five factor groups into one lookup so callers need not know which group a key lives in
- **Unit resolution** — the numerator is read off the factor's unit string (`kgCO2e/...` → ×0.001, `tCO2e/...` → ×1). An unrecognised unit **raises** rather than silently returning a wrong number.
- **`grid_factor(state)`** — state lookup with the national band width carried onto the state point value

### `footprint.py` — the inventory
Produces `Stream` objects, not just scope totals, because a scope total is not actionable.

- Scope 2 from electricity × state grid factor
- Scope 1 from combustion, with **thermal fuels aggregated** into one addressable stream (abatement acts on process heat as a whole) and **diesel held separate**
- **Biogenic CO₂** computed as a memo line and **excluded** from the Scope 1 total per GHG Protocol
- Scope 3 from materials, waste and freight
- **Two intensity bases** emitted: gate-to-gate (Scope 1+2) and cradle-to-gate. Only gate-to-gate is benchmarked.

### `leaks.py` — detection
Three rules, priority-ordered, each stream reported once (a stream benchmarked on two bases must not raise two findings).

| Rule | Trigger | Severity driver |
|---|---|---|
| `benchmark_breach` | intensity > sector p75 | distance above p75, weighted by stream share |
| `material_concentration` | >15% of footprint **and** > p50 | distance above p50 × share |
| `structural_hotspot` | >25% of footprint, no benchmark | share |

`_percentile()` places the plant on the peer distribution by piecewise-linear interpolation across p25/p50/p75, clamped to 1–99 so the UI never claims perfection or total failure.

### `macc.py` — matching and economics
The densest module and the one worth reading.

**Target resolution** maps an intervention's declared target to a live stream, including the aggregates `material_ALL` and `waste_all`.

**Five savings models** — the fix for the single largest class of error:

| Model | Meaning |
|---|---|
| `avoided_purchase` | The plant genuinely stops buying that energy |
| `tariff_delta` | Still buys it, at a different price — only the differential counts |
| `fuel_switch` | Equal-energy replacement; **the delta can be negative** |
| `price_delta` | Material substitution on tonnes actually switched |
| `none` | Whole cash case sits in `opex_delta` |

**Substitution ceilings** — capped by `max_substitution_pct`, by any `SECTOR_CAPS` override, and by the tonnage the plant actually buys.

**`BLOCKED` / `SECTOR_CAPS`** — the refusal layer. Blocked pairs are evaluated then refused with a stated reason; capped pairs proceed at a reduced share with the restriction shown.

**Economics**
```
annualised_capex = CRF(r, lifetime) × capex
LCOA = (annualised_capex + Δopex − gross_saving) / abatement
payback = capex / (gross_saving − Δopex)
NPV = −capex + Σ net_benefit / (1+r)^y
```

**Interaction de-rating** — after sorting by LCOA, each intervention applies to the *residual* of its target stream:
```
remaining[stream] = 1.0
for rec in sorted_by_lcoa:
    frac = rec.abatement / rec.stream_total
    rec.portfolio_abatement = rec.stream_total × remaining[stream] × frac
    remaining[stream] *= (1 − frac)
```
Both standalone and de-rated figures are reported. **Known limitation, declared in the API response:** cross-stream overlap (e.g. in-house regrind against a material substitution) is not de-rated.

### `assess.py` — orchestration
Composes footprint → leaks → recommendations, then adds:
- **Sankey** — three-level `stream → scope → total` graph
- **Compliance** — CBAM exposure `(S1+S2) × export share × reference price`, with precursors excluded *and declared excluded*; BRSR readiness checklist
- **Headline** — the four KPIs and a generated plain-English statement
- **Methodology** — standard, GWP set, factor provenance, benchmark caveat, leak rule

---

## 3. API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Counts of sectors, interventions, factors |
| GET | `/api/sectors` | Sector list with clusters |
| GET | `/api/sector/{key}` | Full sector spec incl. benchmarks and demo profile |
| GET | `/api/reference` | Every emission factor with source, band, price — powers the methodology view |
| POST | `/api/assess` | **The product.** Profile in, full assessment out |
| GET | `/api/demo/{key}` | One-call assessment of a sector's demo profile — what the stage demo hits, so nothing depends on typing |
| GET | `/` | Frontend |

---

## 4. Frontend

**Constraint: no CDN, no framework, no build step.** Venue wifi fails, and a hackathon demo that depends on unpkg is a demo that dies.

Both charts are hand-built SVG:

**Sankey** — streams ordered by **scope first, then size**, which eliminates most ribbon crossing (ordering purely by size forces every large Scope 3 stream to cross the whole diagram). Tail streams bundle into "N smaller sources". Ribbons are cubic Béziers with per-scope colour.

**MACC** — bar width = tonnes, height = ₹/tCO₂e, zero line emphasised. **Axis clamped** to a robust band derived from the 8th–92nd percentile of LCOA values: a single narrow bar at −₹28,000/t would otherwise compress every other intervention into an unreadable sliver. Off-scale bars are drawn to the clamp and **marked with a dashed stroke plus a count annotation**, so a clipped bar never reads as if that were its true value.

**Leak cards** carry an inline peer-distribution strip showing p50, p75 and the plant's position.

**Every recommendation row expands** to show the full working — target stream, abatement range, de-rating, capex, gross saving, opex delta, LCOA, NPV, savings model, caveats and restrictions.

---

## 5. Extension points

| To add | Edit | Code change |
|---|---|---|
| An emission factor | `emission_factors.json` | None |
| An intervention | `interventions.json` | None |
| A sector + benchmarks + demo plant | `sectors.json` | None |
| A refusal or cap rule | `BLOCKED` / `SECTOR_CAPS` in `macc.py` | 3 lines |
| A new savings model | `macc.py` `_evaluate` | One branch |

**Reference data is JSON by design** so a domain expert — the person whose knowledge actually differentiates this product — can extend it without touching Python.

---

## 6. Running it

```bash
cd prototype/backend
python -m uvicorn app:app --reload --port 8077
```

Then open `http://127.0.0.1:8077/`. Requires `fastapi` and `uvicorn`; the engine itself is standard library only.
