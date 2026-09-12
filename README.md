<div align="center">

# PRANGARA — Industrial Carbon Intelligence Network

HackOut'26 · Circular Carbon Ecosystem
**PS10 — Industrial Emission Leak-Point Detector & Circular Alternative Recommender**

![Python](https://img.shields.io/badge/python-3.10%2B-3776AB?logo=python&logoColor=white)
![Tests](https://img.shields.io/badge/tests-passing-2ea44f)
![Offline](https://img.shields.io/badge/runs-fully%20offline-6f42c1)
![Data](https://img.shields.io/badge/sources-SHA--256%20verified-blue)

</div>

---

PRANGARA provides an authoritative, mathematically verified data architecture and software engine for industrial emission leak detection, circular alternative matching, and regulatory compliance.

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

Rebuild the combined PDF report from `docs/` (renders through headless Chrome or Edge, which the script locates itself — no pandoc, no LaTeX):

```bash
python build_report.py
```

Verify the dataset layer — 23 SHA-256 source hashes and 18 physics invariants, both in Node:

```bash
node datasets/08_automated_test_suites/verify_dataset_authenticity.js
node datasets/08_automated_test_suites/test_chakra_invariants.js
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

## Data provenance & Authenticity Policy

Every number within PRANGARA conforms to our strict four-tier classification:
- **🟢 OFFICIAL / PRIMARY REFERENCE**: Direct government, regulator, standard owner, or scientific benchmark (CEA, DESNZ, IPCC, BEE, worldsteel, IAI).
- **🔵 FIRST-PARTY / OPERATOR REPORTED**: Real plant activity data, supplier stock/prices, and provider availability.
- **🟡 PRANGARA CALCULATED / DERIVED**: Transparent, deterministic calculations (Coal NCV conversions, OSRM transport carbon, MACC payback).
- **🟠 SCREENING / LITERATURE-DERIVED**: Published empirical ranges for screening where site measurements are pending.

Under `datasets/`, values are traced back to primary sovereign sources and cryptographically pinned:
- **32 emission factors** across electricity, fuels, materials, transport and waste — plus **15 state grid variants**, because coal-heavy eastern states run materially higher than RE-rich southern ones, and that single choice can move a Scope 2 result by 40%.
- **Primary sources held immutably**: CEA baseline v21/v22, DESNZ 2026 GHG conversion factors, GHG Protocol Corporate Standard, IPCC 2019 refinement, CPCB hazardous waste rules, BIS IS 1489, IEC 60034-30-1, BEE MSME cluster studies, worldsteel / IAI / PlasticsEurope / CEPI / FEVE / GCCA / Textile Exchange LCI and EPD references.
- **Derived engineering models**: coal G1–G17 NCV conversions, IPCC first-order-decay landfill methane, state grid generation mix proxies.
- **A typed layer** with PostgreSQL DDL and seed SQL alongside matched JSON and CSV.
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

datasets/                              the verified data architecture
├── 01_statutory_emission_baselines/   CEA v21/v22 grid, DESNZ 2026 fuels
├── 02_circular_interventions_library/ 30 MACC interventions, capex, payback
├── 03_industrial_sector_benchmarks/   10 SME sector SEC ranges & benchmarks
├── 04_derived_engineering_models/     coal G1–G17 NCV, IPCC FOD landfill models
├── 05_database_and_typed_layer/       PostgreSQL DDL, seed SQL, typed JSON/CSV
├── 06_auditing_and_proofs/            SHA-256 registers, audit verification
├── 07_primary_raw_sources/            immutable sovereign PDFs & XLSX
├── 08_automated_test_suites/          SHA-256 verification & invariant tests
├── 09_operational_marketplace/        circular exchange, fleet listings, M&V plans
└── 10_rag_knowledge_base/             traceable RAG chunks for audit queries

build/
├── Chakra-Report.pdf                  the full project report
└── Chakra-Plant-Report.pdf            a sample per-assessment report
```

## Status

**23/23 cryptographic SHA-256 source checks pass (100%)**, and all sector and intervention invariants assess with **zero invariant violations** — stream sums, abatement ceilings, de-rating monotonicity and substitution caps all hold.

---
*Built in strict compliance with `datasets/PRANGARA_Authentic_Data_Sources_Acquisition_Extraction_Plan.md`.*
