# Full-Stack Architecture

The v1 engine was deliberately stateless — profile in, assessment out, nothing written down. That was the right call for a demo and the wrong one for a product, because three of the things that make Chakra defensible only exist once data accumulates:

1. Benchmarks that are **measured** rather than assumed
2. A realisation rate that is **observed** rather than guessed at 25%
3. A plant that can see **whether it improved** year on year

This document covers the layer added to make those real, and what it deliberately did not change.

---

## 1. Shape

```
┌───────────────────────────────────────────────────────────────────────┐
│  BROWSER — zero external dependencies, renders offline                │
│  hash router · sandbox · auth · portfolio · plant · action tracker    │
│  hand-built SVG: Sankey + MACC                                        │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ JSON over HTTP, session cookie
┌───────────────────────────────▼───────────────────────────────────────┐
│  API — FastAPI, 20 routes                                             │
│                                                                       │
│   ANONYMOUS SANDBOX          │   SIGNED-IN PRODUCT                    │
│   /api/assess  /api/demo     │   /api/plants  /api/portfolio          │
│   stateless, nothing stored  │   persisted, corpus-benchmarked        │
└───────────────┬───────────────────────────────┬───────────────────────┘
                │                               │
┌───────────────▼──────────┐   ┌────────────────▼──────────────────────┐
│  ENGINE (unchanged)      │   │  PLATFORM (new)                        │
│  factors · footprint     │   │  auth   — bcrypt + server sessions     │
│  leaks · macc · assess   │◄──┤  repo   — org-scoped data access       │
│                          │   │  bench  — live corpus blending         │
│  pure functions, no I/O  │   │  report — per-assessment PDF           │
└───────────────┬──────────┘   │  db     — sqlite3, 6 tables            │
                │              └────────────────┬──────────────────────┘
┌───────────────▼──────────────────────────────▼───────────────────────┐
│  DATA                                                                 │
│  emission_factors.json · interventions.json · sectors.json (static)   │
│  chakra.db (accumulating)                                             │
└───────────────────────────────────────────────────────────────────────┘
```

### 1.1 The engine did not change

`factors`, `footprint`, `leaks`, `macc` and `assess` remain pure functions with no database awareness. The only addition is an **optional benchmark override**:

```python
assess(profile, benchmarks=None, benchmark_provenance=None)
```

Pass nothing and you get literature priors — which is exactly what the anonymous sandbox does. Pass a corpus-blended set and the same engine judges the plant against its real peers. The engine never learns where the percentiles came from; provenance is carried through to the response so the UI can say which was used.

**This is why the sandbox and the signed-in product cannot drift apart.** There is one engine and one set of chart renderers. A bug in the MACC shows up in both, or in neither.

---

## 2. Why two surfaces

| | Anonymous sandbox | Signed-in product |
|---|---|---|
| Route | `/api/assess`, `/api/demo/{sector}` | `/api/plants/{id}/assess` |
| Stored | Nothing | Profile + full result, versioned |
| Benchmarks | Literature priors | Blended with live corpus |
| Tracking | None | Action tracker with actuals |
| Needs an account | No | Yes |

An SME owner who has just been asked for carbon data by a customer is not going to create an account before he knows whether the tool is useful. He gets the full engine, on a representative plant from his own cluster, with nothing stored and nothing asked of him.

The account is what he creates once he wants to keep the answer.

---

## 3. Data model

Six tables. The schema lives in `prototype/backend/db.py` and is created on import; `SCHEMA` is idempotent.

```
orgs         id, name, kind(plant|consultant|corporate), created_at
users        id, org_id→orgs, email UNIQUE, name, pw_hash, role, created_at
sessions     token PK, user_id→users, created_at, expires_at
plants       id, org_id→orgs, name, sector, state, referred_by_org→orgs,
             created_at, archived_at
assessments  id, plant_id→plants, created_at, label,
             profile_json, result_json,
             total_tco2e, scope1/2/3_tco2e,           ← denormalised
             scope12_per_t, elec_per_t, thermal_per_t, ← for corpus queries
             cp_abatement, cp_benefit_inr, cp_capex_inr
actions      id, plant_id, assessment_id, intervention_id, name, category,
             status(recommended|planned|in_progress|done|rejected),
             est_abatement/capex/annual_benefit/payback,
             act_abatement/capex/annual_benefit,       ← what actually happened
             target_date, completed_at, rejected_reason, notes,
             UNIQUE(plant_id, intervention_id)
```

Three decisions worth defending:

**Denormalised intensity columns on `assessments`.** The corpus query computes percentiles across a sector's latest assessments. Parsing a JSON result blob per row to reach one float would make the benchmark query cost grow with result size rather than row count. The columns are written once at assessment time.

**`result_json` stored whole.** An assessment is a point-in-time statement made under a specific set of emission factors, benchmarks and assumptions. If a factor is corrected next month, last month's report must still say what it said — otherwise it is not an audit trail. So the full result is frozen, not recomputed on read.

**`UNIQUE(plant_id, intervention_id)` on actions.** One row per intervention per plant, carried across reassessments. Estimates refresh; status and actuals do not.

### 3.1 Why sqlite3 and not an ORM

The schema is six tables of flat rows. An ORM would insert a translation layer between what is written and what is stored, and the entire premise of this product is that every number is traceable. Parameterised SQL you can read in one sitting serves that better, and it keeps the dependency surface at zero for the storage layer.

This is a reversible decision. If the schema grows relationships worth mapping, SQLAlchemy is already available.

---

## 4. Request lifecycle: a signed-in assessment

`POST /api/plants/{id}/assess`

1. **`auth.current_user`** resolves the session cookie against `sessions`, or 401s.
2. **`repo.get_plant(org_id, plant_id)`** — scoped by org. A plant belonging to another organisation returns 404, not 403: the existence of the row is itself not disclosed.
3. **Identity is overwritten from the plant record.** The submitted profile carries activity data only; `name`, `sector` and `state` come from the database. A client cannot re-sector or rename a plant through the assessment endpoint.
4. **`benchmarks.blended_benchmarks(sector, exclude_plant_id=plant_id)`** builds the percentile set, excluding this plant's own history.
5. **`engine.assess(profile, benchmarks, provenance)`** — the unchanged engine.
6. **Persist** the profile, the full result, and the denormalised columns.
7. **`_sync_actions`** creates or refreshes one action row per recommendation, preserving any status and actuals the user has set, and retiring interventions that no longer apply *unless* the user already acted on them.

Step 7 is the one that matters most for trust. A reassessment must never silently reset someone's implementation tracker — if a plant manager marked eight things done in March, re-running the assessment in June must not quietly wipe that.

---

## 5. What was added, file by file

| File | Lines | Responsibility |
|---|---|---|
| `db.py` | ~170 | Schema, connection-per-thread, tiny query helpers |
| `auth.py` | ~130 | bcrypt hashing, server-side sessions, FastAPI dependencies |
| `repo.py` | ~250 | Org-scoped plants, assessments, actions, portfolio rollup |
| `benchmarks.py` | ~200 | Corpus percentiles, shrinkage blending, realisation stats |
| `report.py` | ~290 | Per-assessment HTML + PDF, server-rendered MACC as SVG |
| `app.py` | ~330 | 20 routes across both surfaces |
| `tests/test_stack.py` | ~300 | 20 tests |
| Frontend | ~560 added | Router, auth, portfolio, plant view, action tracker |

---

## 6. What is still missing

Stated plainly, because a full-stack claim invites the question.

| Gap | Consequence | When it matters |
|---|---|---|
| **No full activity-data intake form** | Reassessment currently edits output, revenue, electricity and export share; fuels/materials/waste/freight come from the sector template | First real user |
| No email verification or password reset | An account is only as recoverable as the password | First real user |
| No rate limiting on auth | Brute force is unthrottled | Public deployment |
| SQLite, single file | One writer at a time | A few hundred concurrent orgs |
| No CSRF token | Mitigated by `SameSite=Lax` cookies and a JSON-only API, not eliminated | Public deployment |
| No migrations tool | Schema changes need care | Second schema change |
| Sessions never pruned | `sessions` grows | Housekeeping |

None of these block the demo. All of them block a real deployment, and saying so is more useful than a feature list that implies otherwise.

---

## 7. Running it

```bash
pip install -r requirements.txt
cd prototype/backend
python -m uvicorn app:app --reload --port 8080
```

Open `http://127.0.0.1:8080/`. The database is created on first run at `prototype/backend/chakra.db` (gitignored). Set `CHAKRA_DB` to point elsewhere.

```bash
python -m pytest tests/test_stack.py -q     # 20 tests, throwaway database
```
