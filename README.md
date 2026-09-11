# Chakra

**See where your carbon leaks. Close the loop with numbers that pay.**

HackOut'26 · Circular Carbon Ecosystem · **PS10 — Industrial Emission Leak-Point Detector & Circular Alternative Recommender**

---

An Indian industrial SME enters ten numbers it already has — the electricity bill, the coal purchase, the cotton invoices. Chakra returns a Scope 1/2/3 inventory with uncertainty bands, finds where carbon is leaking **relative to that plant's own sector peers**, and produces a ranked, costed portfolio of circular interventions on a marginal abatement cost curve.

It leads with rupees and closes with tonnes, because an SME owner is not buying a sustainability product — they are buying a cost-reduction product with a compliance side-benefit.

## Run it

```bash
cd prototype/backend
python -m uvicorn app:app --reload --port 8077
```

Open **http://127.0.0.1:8077/**. Requires `fastapi` and `uvicorn`; the engine itself is standard library only. **No internet connection is needed at any point** — no CDN, no external API.

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

## Layout

```
docs/                        the written work
├── 00-EXECUTIVE-SUMMARY.md
├── 01-PRD.md                        product requirements
├── 02-RESEARCH-DOSSIER.md           market, regulation, factors, benchmarks
├── 03-USERS-AND-PERSONAS.md
├── 04-COMPETITIVE-LANDSCAPE.md      including where we would lose
├── 05-INNOVATION-AND-FEASIBILITY.md including the risk register
├── 06-IMPACT-MODEL.md
├── 07-ARCHITECTURE-AND-MODULES.md
├── 08-SCALE-AND-BUSINESS-MODEL.md
├── 09-EXECUTION-PLAN-48H.md
├── 10-PITCH-AND-QA.md               demo script + hostile-question prep
└── 11-METHODOLOGY-AND-LIMITATIONS.md

prototype/
├── backend/
│   ├── app.py                       FastAPI, 7 endpoints, stateless
│   └── engine/
│       ├── constants.py             NCVs, tariffs, CRF, thresholds
│       ├── factors.py               units + uncertainty bands
│       ├── footprint.py             Scope 1/2/3 inventory by stream
│       ├── leaks.py                 three detection rules
│       ├── macc.py                  matching, economics, de-rating, refusal
│       └── assess.py                orchestration, Sankey, compliance
├── frontend/                        zero dependencies, hand-built SVG
└── data/
    ├── emission_factors.json        31 factors + 15 state grids, sourced, banded
    ├── interventions.json           30 circular interventions
    └── sectors.json                 10 Indian sectors + benchmarks + demo plants
```

Reference data is JSON so a domain expert can extend it without touching Python.

## Status

Working end to end. All 10 sectors assess cleanly with **zero invariant violations** (stream sums, abatement ceilings, de-rating monotonicity, substitution caps).

## What it is not

A **screening tool**, not a BEE-accredited energy audit and not an assurance engine. Its economics are planning-grade estimates meant to rank options and justify getting a vendor quotation — not to replace one. Every limitation is listed in [`docs/11-METHODOLOGY-AND-LIMITATIONS.md`](docs/11-METHODOLOGY-AND-LIMITATIONS.md) and surfaced in the product's own UI.
