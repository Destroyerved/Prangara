# Chakra

**See where your carbon leaks. Close the loop with numbers that pay.**

HackOut'26 · Circular Carbon Ecosystem · **PS10 — Industrial Emission Leak-Point Detector & Circular Alternative Recommender**

---

An Indian industrial SME enters ten numbers it already has — the electricity bill, the coal purchase, the cotton invoices. Chakra returns a Scope 1/2/3 inventory with uncertainty bands, finds where carbon is leaking **relative to that plant's own sector peers**, and produces a ranked, costed portfolio of circular interventions on a marginal abatement cost curve.

It leads with rupees and closes with tonnes, because an SME owner is not buying a sustainability product — they are buying a cost-reduction product with a compliance side-benefit.

## Run it

```bash
pip install -r requirements.txt
cd prototype/backend
python -m uvicorn app:app --reload --port 8080
```

Open **http://127.0.0.1:8080/**. **No internet connection is needed at any point** — no CDN, no external API. The database is created on first run at `prototype/backend/chakra.db`.

```bash
python -m pytest tests/test_stack.py -q     # 20 tests
```

## Two surfaces

| | Anonymous sandbox | Signed-in product |
|---|---|---|
| Stores | **Nothing** | Plants, assessments, actions |
| Benchmarks | Literature priors | **Blended with the live corpus** |
| Tracking | — | Implementation tracker with actuals |
| Account | Not required | Required |

Same engine, same charts. An SME who has just been asked for carbon data gets the full assessment on a plant from their own cluster before handing over anything.

## Result on the hero demo — Tirupur knitwear dyeing unit

| | |
|---|---|
| Annual footprint | **24,069 tCO₂e** (19,414–29,492, ±20.9%) |
| Scope split | 28% S1 · 8% S2 · **64% S3** |
| Largest leak point | Purchased cotton yarn — **60.6%**, `critical` |
| Cash-positive portfolio | **17 interventions · ₹4.66 Cr/yr · ₹4.56 Cr capex · 12-month payback** |
| Abatement at no net cost | **25%** of footprint (42% available in total) |

Across all ten sectors, roughly **40% of an SME's footprint sits behind a positive business case.**

## What makes it more than a calculator

1. **Benchmark-relative leak detection** — a leak is not a big number, it is a *bigger number than the plant next door achieves on the same product*. Three rules: benchmark breach vs sector p75, material concentration, structural Scope 3 hotspot.
2. **A real MACC** — bar width is tonnes, height is ₹/tCO₂e, sorted cheapest first. Everything below the zero line pays for itself.
3. **It refuses** — the engine evaluates and then *rejects* inadmissible interventions. It will not tell a GMP pharma plant to use recycled blister foil, nor a Morbi tile kiln to burn briquettes, and it caps recycled cotton at 25% because staple length falls with every recycling pass.
4. **Interaction de-rating** — seven interventions target the electricity meter; each applies to what the previous one left behind, not to the original bill.
5. **Uncertainty carried to the headline** — every factor has a band, and the band survives every multiplication.
6. **A data flywheel that actually runs** — sector benchmarks shrink from literature toward measured percentiles at `n/(n+8)`. A plant is never benchmarked against its own data, and only its latest assessment counts.
7. **Realisation measured, not assumed** — the impact model has to assume a 25% realisation rate. The action tracker records estimated vs achieved and replaces that assumption with a number.

## Layout

```
docs/                                  the written work — 19 documents
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
    ├── emission_factors.json          31 factors + 15 state grids, sourced, banded
    ├── interventions.json             30 circular interventions
    └── sectors.json                   10 Indian sectors + benchmarks + demo plants

datasets/                              authoritative verified data architecture
├── 01_statutory_emission_baselines/   CEA v21/22 grid, DESNZ 2026 fuels
├── 02_circular_interventions_library/ 30 MACC interventions, capex, payback
├── 03_industrial_sector_benchmarks/   10 SME sector SEC ranges & benchmarks
├── 04_derived_engineering_models/     Coal G1-G17 NCV, IPCC FOD landfill models
├── 05_database_and_typed_layer/       PostgreSQL DDL, seed SQL, typed JSON/CSV
├── 06_auditing_and_proofs/            SHA-256 registers, audit verification
├── 07_primary_raw_sources/            Immutable sovereign PDFs & XLSX
└── 08_automated_test_suites/          100% SHA-256 verification & invariant tests

build/
├── Chakra-Report.pdf                  the full project report
└── Chakra-Plant-Report.pdf            a sample per-assessment report
```

Reference data is JSON so a domain expert can extend it without touching Python.

## Status

Working end to end. **20/20 tests pass**; all 10 sectors assess with **zero invariant violations** (stream sums, abatement ceilings, de-rating monotonicity, substitution caps).

## What it is not

A **screening tool**, not a BEE-accredited energy audit and not an assurance engine. Its economics are planning-grade estimates meant to rank options and justify getting a vendor quotation — not to replace one. Every limitation is listed in [`docs/11-METHODOLOGY-AND-LIMITATIONS.md`](docs/11-METHODOLOGY-AND-LIMITATIONS.md) and [`docs/15-FEATURE-CATALOGUE.md`](docs/15-FEATURE-CATALOGUE.md), and surfaced in the product's own UI.
