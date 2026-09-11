<div align="center">

# Prangara

**See where your carbon leaks. Close the loop with numbers that pay.**

HackOut'26 · Circular Carbon Ecosystem
**PS10 — Industrial Emission Leak-Point Detector & Circular Alternative Recommender**

![Python](https://img.shields.io/badge/python-3.10%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-stdlib-003B57?logo=sqlite&logoColor=white)
![Tests](https://img.shields.io/badge/tests-20%2F20%20passing-2ea44f)
![Offline](https://img.shields.io/badge/runs-fully%20offline-6f42c1)
![Data](https://img.shields.io/badge/sources-SHA--256%20verified-blue)
a
</div>

---

An Indian industrial SME enters ten numbers it already has — the electricity bill, the coal purchase, the cotton invoices. Prangara returns a Scope 1/2/3 inventory with uncertainty bands, finds where carbon is leaking **relative to that plant's own sector peers**, and produces a ranked, costed portfolio of circular interventions on a marginal abatement cost curve.

It leads with rupees and closes with tonnes, because an SME owner is not buying a sustainability product — they are buying a cost-reduction product with a compliance side-benefit.

## Why it exists

India has roughly 63 million MSMEs, and a growing share of them are now being asked to state a carbon footprint and show a reduction plan — by EU customers under CBAM (definitive regime live since January 2026), by listed Indian customers under BRSR Core, by lenders under green-finance criteria. Almost none can answer.

The tools that do exist are enterprise carbon-accounting platforms priced for corporates with sustainability departments, and they answer the wrong question. They tell a plant *what* its footprint is. They do not tell it **what to do about it, what that costs, and when it pays back**.

Three facts a factory owner in Tirupur or Coimbatore faces at once:

1. **They do not know where the carbon comes from.** Intuition says "the boiler". Usually it is purchased cotton or steel — 60–70% of the footprint, and invisible on every utility bill.
2. **Generic advice does not convert.** "Install solar" is not a decision. "₹2.17 Cr capex, 44-month payback, removes 367 tCO₂e/yr" is a decision.
3. **The deadline is commercial, not moral.** The European customer is the one asking, and they are asking now.

## Quick start

```bash
pip install -r requirements.txt
```

```bash
cd prototype/backend && python -m uvicorn app:app --reload --port 8080
```

Open **http://127.0.0.1:8080/**. **No internet connection is needed at any point** — no CDN, no external API, no key to configure. The SQLite database is created on first run next to the backend, and the frontend ships zero dependencies with hand-built SVG charts.

Run the test suite:

```bash
cd prototype/backend && python -m pytest tests/test_stack.py -q
```

Rebuild the combined PDF report from `docs/` (renders through headless Chrome or Edge, which the script locates itself — no pandoc, no LaTeX):

```bash
python build_report.py
```

Verify the dataset layer — 23 SHA-256 source hashes and 18 physics invariants, both in Node:

```bash
node datasets/08_automated_test_suites/verify_dataset_authenticity.js
```

## The pipeline

| Stage | What comes out |
|---|---|
| **1. Inventory** | Scope 1/2/3 footprint under the GHG Protocol Corporate Standard, AR6 GWP100, every figure carrying an uncertainty band and a cited factor |
| **2. Leak detection** | Streams ranked by three rules — benchmark breach vs sector p75, material concentration, structural Scope 3 hotspot — each with the peer percentile and the tonnes recoverable by reaching median |
| **3. Recommendation** | A 30-intervention circular library matched to the plant, each costed to a levelised cost of abatement (₹/tCO₂e), capex, payback and NPV |
| **4. Decision** | A marginal abatement cost curve. Bar width is tonnes, height is ₹/tCO₂e, sorted cheapest first. Everything below the zero line pays for itself. |
| **5. Compliance** | Indicative CBAM export exposure and a BRSR disclosure-readiness checklist |

## What makes it more than a calculator

**1. Benchmark-relative leak detection.** A leak is not a big number — it is a *bigger number than the plant next door achieves on the same product*. Three rules fire: breach of the sector p75, material concentration above 15% of footprint while sitting over p50, and structural Scope 3 hotspots. Severity scales with distance above p75.

**2. A real MACC.** The marginal abatement cost curve is what climate consultants deliver at ₹2–10 lakh per engagement. Everything below the zero line is money the plant is currently leaving on the table.

**3. It refuses.** The engine evaluates and then *rejects* interventions that are technically valid but inadmissible. It will not tell a GMP pharma plant to use recycled blister foil, nor a Morbi tile kiln to burn briquettes, and it caps recycled cotton at 25% because staple length falls with every recycling pass. A recommender that never says no cannot be trusted when it says yes.

**4. Interaction de-rating.** Seven interventions target the same electricity meter. Each applies to what the previous one left behind, not to the original bill — so the portfolio total is physical rather than additive.

**5. Uncertainty carried to the headline.** Every factor has a low/base/high band, and the band survives every multiplication: *24,069 tCO₂e (19,414–29,492, ±20.9%)*. Point estimates are never shown without their range.

**6. A data flywheel that actually runs.** Sector benchmarks shrink from literature priors toward measured percentiles at `n/(n+8)`. A plant is never benchmarked against its own data, and only its latest assessment counts.

**7. Realisation measured, not assumed.** The impact model has to assume a 25% realisation rate. The action tracker records estimated vs achieved and replaces that assumption with a number.

## Two surfaces, one engine

| | Anonymous sandbox | Signed-in product |
|---|---|---|
| Stores | **Nothing** | Plants, assessments, actions |
| Benchmarks | Literature priors | **Blended with the live corpus** |
| Tracking | — | Implementation tracker with actuals |
| Reports | On-screen | Per-assessment PDF, server-rendered MACC |
| Account | Not required | Required (bcrypt + revocable server sessions) |

Same charts, same maths. An SME that has just been asked for carbon data gets a full assessment on a plant from their own cluster before handing over anything.

## Result on the hero demo — Tirupur knitwear dyeing unit

| | |
|---|---|
| Annual footprint | **24,069 tCO₂e** (19,414–29,492, ±20.9%) |
| Scope split | 28% Scope 1 · 8% Scope 2 · **64% Scope 3** |
| Largest leak point | Purchased cotton yarn — **60.6%** of footprint, `critical` |
| Benchmark breaches | Electricity at p78, process heat at p76 of sector peers |
| Cash-positive portfolio | **17 interventions · ₹4.66 Cr/yr net benefit · ₹4.56 Cr capex · 12-month blended payback** |
| Abatement at no net cost | **25%** of footprint (42% available in total) |
| Correctly constrained | Recycled cotton **capped at 25%** by the spinning constraint |

Across all ten sectors, roughly **40% of an SME's footprint sits behind a positive business case.**

## Sectors covered

Each of the ten ships its own benchmark percentiles, cluster list, process steps, regulatory flags, constraint set and synthetic demo plant.

| Sector | Demo plant |
|---|---|
| Textile dyeing, bleaching and processing | Tirupur knitwear dyeing unit |
| Ferrous and non-ferrous foundry / metal casting | Coimbatore ferrous and aluminium jobbing foundry |
| Ceramic tiles and sanitaryware | Morbi vitrified tile plant |
| Food and agro processing | Nashik fruit pulp and concentrate unit |
| Auto components and precision machining | Pune tier-2 machined components supplier |
| Pharmaceutical formulation and packaging | Hyderabad oral solid dosage formulation plant |
| Plastic injection and blow moulding | Silvassa injection moulding unit |
| Paper, board and packaging conversion | Vapi corrugated box plant |
| Light engineering and metal fabrication | Ludhiana fabricated components unit |
| Specialty and intermediate chemicals | Ankleshwar intermediates unit |

## Data provenance

Reference data is JSON so a domain expert can extend it without touching Python. Under `datasets/`, the same values are traced back to primary sovereign sources and cryptographically pinned.

- **32 emission factors** across electricity, fuels, materials, transport and waste — plus **15 state grid variants**, because coal-heavy eastern states run materially higher than RE-rich southern ones, and that single choice can move a Scope 2 result by 40%.
- **Primary sources held immutably**: CEA baseline v21/v22, DESNZ 2026 GHG conversion factors, GHG Protocol Corporate Standard, IPCC 2019 refinement, CPCB hazardous waste rules, BIS IS 1489, IEC 60034-30-1, BEE MSME cluster studies, worldsteel / IAI / PlasticsEurope / CEPI / FEVE / GCCA / Textile Exchange LCI and EPD references.
- **Derived engineering models**: coal G1–G17 NCV conversions, IPCC first-order-decay landfill methane, state grid generation mix proxies.
- **A typed layer** with PostgreSQL DDL and seed SQL alongside matched JSON and CSV, for teams that want the corpus in a database rather than in files.
- **Audit trail**: SHA-256 registers, a source registry, a download manifest and a verification report, all re-checkable by the scripts in `08_automated_test_suites/`.

## Layout

```
docs/                                  the written work — 18 documents
├── 00-EXECUTIVE-SUMMARY.md
├── 01-PRD.md                          product requirements
├── 02-RESEARCH-DOSSIER.md             market, regulation, factors, benchmarks
├── 03-USERS-AND-PERSONAS.md
├── 04-COMPETITIVE-LANDSCAPE.md        including where we would lose
├── 05-INNOVATION-AND-FEASIBILITY.md   including the risk register
├── 06-IMPACT-MODEL.md
├── 07-ARCHITECTURE-AND-MODULES.md     the engine
├── 08-SCALE-AND-BUSINESS-MODEL.md
├── 09-EXECUTION-PLAN-48H.md
├── 10-PITCH-AND-QA.md                 demo script + hostile-question prep
├── 11-METHODOLOGY-AND-LIMITATIONS.md
├── 12-FULLSTACK-ARCHITECTURE.md       the platform layer
├── 13-DATA-FLYWHEEL.md                how benchmarks become measured
├── 14-API-REFERENCE.md                all 20 routes
├── 15-FEATURE-CATALOGUE.md            everything built, and what isn't
├── 16-TEAM-TASKS-4-PEOPLE.md          full task split for a team of four
└── 17-SECURITY-AND-TESTING.md         tenancy model + what the tests prove

prototype/
├── backend/
│   ├── app.py                         FastAPI, 20 routes, two surfaces
│   ├── db.py                          sqlite3 schema, 6 tables
│   ├── auth.py                        bcrypt + revocable server sessions
│   ├── repo.py                        org-scoped data access
│   ├── benchmarks.py                  live corpus blending + realisation stats
│   ├── report.py                      per-assessment PDF, server-rendered MACC
│   ├── tests/test_stack.py            20 full-stack tests
│   └── engine/
│       ├── constants.py               NCVs, tariffs, CRF, thresholds
│       ├── factors.py                 units + uncertainty bands
│       ├── footprint.py               Scope 1/2/3 inventory by stream
│       ├── leaks.py                   three detection rules
│       ├── macc.py                    matching, economics, de-rating, refusal
│       └── assess.py                  orchestration, Sankey, compliance
├── frontend/                          zero dependencies, hand-built SVG
└── data/
    ├── emission_factors.json          32 factors + 15 state grids, sourced, banded
    ├── interventions.json             30 circular interventions
    └── sectors.json                   10 Indian sectors + benchmarks + demo plants

datasets/                              the verified data architecture
├── 01_statutory_emission_baselines/   CEA v21/v22 grid, DESNZ 2026 fuels
├── 02_circular_interventions_library/ 30 MACC interventions, capex, payback
├── 03_industrial_sector_benchmarks/   10 SME sector SEC ranges & benchmarks
├── 04_derived_engineering_models/     coal G1–G17 NCV, IPCC FOD landfill models
├── 05_database_and_typed_layer/       PostgreSQL DDL, seed SQL, typed JSON/CSV
├── 06_auditing_and_proofs/            SHA-256 registers, audit verification
├── 07_primary_raw_sources/            immutable sovereign PDFs & XLSX
└── 08_automated_test_suites/          SHA-256 verification & invariant tests

build/
├── Chakra-Report.pdf                  the full project report
└── Chakra-Plant-Report.pdf            a sample per-assessment report
```

## API at a glance

Twenty routes; the full contract is in [`docs/14-API-REFERENCE.md`](docs/14-API-REFERENCE.md).

| Group | Routes |
|---|---|
| Public | `GET /api/health` · `/api/sectors` · `/api/sector/{key}` · `/api/reference` · `/api/corpus` |
| Sandbox | `POST /api/assess` · `GET /api/demo/{key}` |
| Auth | `POST /api/auth/register` · `/login` · `/logout` · `GET /api/auth/me` |
| Plants | `GET`/`POST /api/plants` · `GET`/`DELETE /api/plants/{id}` · `POST /api/plants/{id}/assess` |
| Results | `GET /api/assessments/{id}` · `GET /api/assessments/{id}/report` · `GET /api/portfolio` |
| Tracking | `PATCH /api/plants/{id}/actions/{intervention_id}` |

## Status

Working end to end. **20/20 full-stack tests pass**, and all ten sectors assess with **zero invariant violations** — stream sums, abatement ceilings, de-rating monotonicity and substitution caps all hold. The dataset layer verifies at 100% on its SHA-256 register.

## What it is not

A **screening tool** — not a BEE-accredited energy audit, and not an assurance engine. Its economics are planning-grade estimates meant to rank options and justify getting a vendor quotation, not to replace one. Emission factors in this build are literature values and must be re-verified against the primary source editions cited before commercial use, and the sector benchmarks are indicative screening percentiles that should be replaced with cluster-specific survey data.

Every limitation is listed in [`docs/11-METHODOLOGY-AND-LIMITATIONS.md`](docs/11-METHODOLOGY-AND-LIMITATIONS.md) and [`docs/15-FEATURE-CATALOGUE.md`](docs/15-FEATURE-CATALOGUE.md), and surfaced in the product's own UI.

---

<sub>The project was previously named **Chakra**, and the rename is still in flight: the `datasets/` tree has moved over, while the application layer still carries the old name in a few places — the SQLite file it creates is `prototype/backend/chakra.db` (override with the `CHAKRA_DB` environment variable), the generated PDFs in `build/` are still `Chakra-*.pdf`, and internal identifiers and docs headings largely read `chakra_*`. Nothing is broken by this; it is just not finished.</sub>
