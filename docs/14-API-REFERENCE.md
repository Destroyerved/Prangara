# API Reference

Base URL `http://127.0.0.1:8080` · 20 routes · FastAPI · interactive docs at `/docs`

Authentication is a `chakra_session` cookie, `HttpOnly` + `SameSite=Lax`, set by register/login. Routes marked 🔒 require it and return **401** otherwise.

---

## Reference and public

### `GET /api/health`
Liveness plus corpus size.
```json
{"status":"ok","version":"0.2.0","sectors":10,"interventions":30,
 "factors":31,"plants":9,"assessments":9}
```

### `GET /api/sectors`
```json
{"sectors":[{"key":"textile_dyeing","label":"Textile dyeing, bleaching and processing",
 "clusters":["Tirupur, TN","Surat, GJ"],"demo_name":"Tirupur knitwear dyeing unit"}]}
```

### `GET /api/sector/{key}`
Full sector spec: `benchmarks`, `process_steps`, `energy_character`, `regulatory_flags`, `dominant_materials`, and the `demo_profile` used to prefill forms. **404** on unknown key.

### `GET /api/reference`
Every emission factor with `value`, `low`, `high`, `unit`, `scope`, `source`, `note` and `typical_price_inr`, grouped by `electricity` / `fuels` / `materials` / `transport` / `waste`. Powers the methodology view; this is the endpoint that makes every number traceable.

### `GET /api/corpus`
Flywheel health — how much of each sector benchmark is measured rather than assumed. See [`13-DATA-FLYWHEEL.md`](13-DATA-FLYWHEEL.md).
```json
{"total_plants":9,"total_assessments":9,"prior_strength":8.0,"min_corpus":3,
 "by_sector":[{"sector":"foundry_casting","plants":6,
               "benchmark_weight":0.429,"status":"blended"}],
 "explainer":"Sector benchmarks start as published literature percentiles…"}
```

---

## Anonymous assessment

Stateless. Nothing is written. This is what the public demo hits.

### `POST /api/assess`
```json
{ "sector":"textile_dyeing", "state":"Tamil Nadu",
  "annual_output_t":2400, "annual_revenue_cr":34, "electricity_kwh":3000000,
  "fuels":{"COAL_INDIAN":3900,"DIESEL":42000},
  "materials":{"COTTON_CONV":2650,"PET_VIRGIN":180},
  "waste":{"LANDFILL_ORGANIC":220}, "freight":{"ROAD_FREIGHT_HCV":1950000},
  "eu_export_share_pct":25, "tariff_inr_per_kwh":8, "discount_rate":0.12 }
```
Returns the full assessment (§ *Assessment shape* below). Benchmarked against **literature priors** — the anonymous caller has no plant identity to exclude from the corpus.

### `GET /api/demo/{sector}`
One-call assessment of that sector's built-in demo plant. **This is what the stage demo hits**, so nothing depends on typing.

---

## Authentication

### `POST /api/auth/register`
```json
{"email":"a@b.com","password":"≥8 chars","name":"Anand Rao",
 "org_name":"Coimbatore Energy Partners","org_kind":"plant|consultant|corporate"}
```
Creates org + owner user, signs in, sets the cookie. **400** invalid email or password under 8 characters · **409** email already registered.

### `POST /api/auth/login`
`{"email":…,"password":…}` → sets cookie. **401** on failure, with an **identical message** whether the account is missing or the password is wrong, so the endpoint cannot enumerate registered addresses.

### `POST /api/auth/logout`
Deletes the server-side session row and clears the cookie.

### `GET /api/auth/me`
`{"authenticated":true,"user":{"user_id":…,"email":…,"org_id":…,"org_name":…,"org_kind":…}}`
Never 401s — returns `authenticated:false` for anonymous callers, so the frontend can boot either way.

---

## Plants 🔒

All plant routes are **org-scoped at the data layer**. A plant belonging to another organisation returns **404**, not 403 — the existence of the row is itself not disclosed.

### `GET /api/plants`
Each plant with its latest assessment headline and action counts:
```json
{"plants":[{"id":"plt_…","name":"Kovai Castings","sector":"foundry_casting",
  "state":"Tamil Nadu","total_tco2e":18786.4,"scope3_tco2e":12410.2,
  "cp_abatement":10874.0,"cp_benefit_inr":55080000,
  "actions_done":1,"actions_active":1,"last_assessed_at":1789…}]}
```

### `POST /api/plants`
`{"name":"Kovai Castings","sector":"foundry_casting","state":"Tamil Nadu"}` → the created plant. **400** unknown sector or empty name.

### `GET /api/plants/{id}`
`{"plant":{…}, "assessments":[…], "actions":[…]}` — everything the plant view needs in one call.

### `DELETE /api/plants/{id}`
Soft delete: sets `archived_at`. Assessments and actions are retained; the plant leaves the corpus and the portfolio.

### `POST /api/plants/{id}/assess`
```json
{"profile":{…same shape as /api/assess…},"label":"FY25 baseline"}
```
Runs against the **live corpus** (excluding this plant), persists profile + result, and syncs the action rows. Returns the assessment with `assessment_id` and `plant_id` added.

> **Identity is taken from the plant record, not the profile.** `name`, `sector` and `state` are overwritten server-side, so a client cannot rename or re-sector a plant through this endpoint.

---

## Assessments 🔒

### `GET /api/assessments/{id}`
The stored result, verbatim as computed. Results are **frozen, never recomputed** — an assessment is a point-in-time statement under a specific set of factors and benchmarks, and an audit trail that silently changes is not an audit trail.

### `GET /api/assessments/{id}/report`
PDF download with the MACC embedded as server-rendered SVG. `?fmt=html` returns the HTML instead. If no browser is available to render, responds with HTML plus an `X-Chakra-Note` header rather than failing.

---

## Actions 🔒

### `PATCH /api/plants/{plant_id}/actions/{intervention_id}`
```json
{"status":"done","act_abatement_tco2e":3800,"act_capex_inr":1450000,
 "act_annual_benefit_inr":16100000,"notes":"Supplier: Sakthi secondary ingot"}
```
Status ∈ `recommended` · `planned` · `in_progress` · `done` · `rejected`. **400** otherwise.

`completed_at` is set automatically on entering `done` and cleared on leaving it. Recording actuals is what turns the realisation rate from an assumption into a measurement — every field is optional, and the estimate is used where an actual is absent.

---

## Portfolio 🔒

### `GET /api/portfolio`
Org-wide rollup — the consultant and corporate view.
```json
{"plants_total":9,"plants_assessed":9,
 "total_footprint_tco2e":188027.3,"scope3_share_pct":66.0,
 "cash_positive_abatement_tco2e":85455.1,"cash_positive_abatement_pct":45.4,
 "cash_positive_benefit_inr":521600000,
 "realisation":{"actions_total":178,"actions_done":1,
   "identified_tco2e":106615.3,"committed_tco2e":3805.0,"realised_tco2e":3800.0,
   "realisation_rate":0.036,"abatement_accuracy":1.191,
   "capex_accuracy":0.833,"measured_n":1},
 "by_sector":[…],"plants":[…]}
```

---

## Assessment shape

Returned by `/api/assess`, `/api/demo/{sector}`, `/api/plants/{id}/assess` and `/api/assessments/{id}`.

```
headline         total, range, uncertainty %, top leak, peer percentile,
                 cash-positive benefit/capex/payback, plain-English statement
footprint        scope1/2/3, scope_split_pct, biogenic memo line, intensities,
                 grid_source, uncertainty_pct,
                 streams[] { label, scope, tco2e, range, share_pct,
                             activity_qty, activity_unit, source, detail }
sankey           nodes[] {name, kind}, links[] {source, target, value, scope}
leaks            peer_position, leak_count, critical_count,
                 total_gap_to_median_tco2e, benchmark_source, benchmark_provenance,
                 leaks[] { label, rule, severity, share_pct, metric,
                           actual, p50, p75, percentile, finding }
recommendations  count, total_abatement_pct,
                 recommendations[] { name, category, abatement_tco2e,
                   portfolio_abatement_tco2e, derating_pct, lcoa_inr_per_tco2e,
                   capex_inr, net_annual_benefit_inr, payback_months, npv_inr,
                   savings_model, physical_note, caveats, restriction_note,
                   confidence, difficulty, disruption_days },
                 macc_curve[] { x_start, width, standalone, height, cash_positive },
                 portfolio { all, cash_positive_only, quick_wins },
                 blocked[] { name, reason },
                 assumptions { tariff, discount_rate, derating_note, capex_note }
compliance       cbam { applicable, exposure, basis, caveat }, brsr { readiness[] }
methodology      standard, gwp, factor_note, verification_status,
                 benchmark_note, leak_rule
```

Field semantics — LCOA, de-rating, savings models, substitution caps — are defined in [`11-METHODOLOGY-AND-LIMITATIONS.md`](11-METHODOLOGY-AND-LIMITATIONS.md).

---

## Errors

| Code | Meaning |
|---|---|
| 400 | Validation — unknown sector, bad status, weak password |
| 401 | No session, or expired |
| 404 | Not found **or not yours** |
| 409 | Email already registered |
| 422 | FastAPI request-body validation |

All errors return `{"detail":"…"}` with a message written for the user, not the logs.
