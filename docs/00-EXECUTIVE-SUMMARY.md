# Chakra — Executive Summary

**HackOut'26 · Circular Carbon Ecosystem · PS10**
*Industrial Emission Leak-Point Detector & Circular Alternative Recommender*

> **Chakra** — *see where your carbon leaks, close the loop with numbers that pay.*

---

## The one-paragraph version

India has roughly 63 million MSMEs. A growing number of them are being asked — by EU customers under CBAM, by listed Indian customers under BRSR Core, by lenders under green finance criteria — to state their carbon footprint and show a reduction plan. Almost none can. The tools that exist are enterprise carbon accounting platforms priced for corporates with sustainability departments, and they answer the wrong question: they tell you *what* your footprint is, not *what to do about it, what it costs, and when it pays back*. Chakra takes ten minutes of data an SME owner already has on their electricity bill and purchase ledger, finds the points where carbon is leaking relative to their own sector's peers, and returns a ranked, costed portfolio of circular interventions on a marginal abatement cost curve — leading with rupees, closing with tonnes.

## The problem, stated precisely

An SME factory owner in Tirupur or Coimbatore faces three simultaneous facts:

1. **They do not know where their carbon comes from.** Intuition says "the boiler". Often it is the purchased cotton or steel, which is 60–70% of the footprint and invisible on any utility bill.
2. **Generic advice does not convert.** "Install solar" is not a decision. "₹2.17 Cr capex, 44-month payback, removes 367 tCO₂e/yr" is a decision.
3. **The deadline is commercial, not moral.** CBAM's definitive regime began in January 2026. An exporting foundry has a reporting obligation *now*, and its European customer is the one asking.

## What Chakra does

| Stage | Output |
|---|---|
| **1. Inventory** | Scope 1/2/3 footprint under GHG Protocol, every figure carrying an uncertainty band and a cited factor |
| **2. Leak detection** | Streams ranked by three rules — benchmark breach vs sector p75, material concentration, structural hotspot — each with the peer percentile and the tonnes recoverable by reaching median |
| **3. Recommendation** | 30-intervention circular library matched to the plant, each costed to a levelised cost of abatement (₹/tCO₂e), capex, payback and NPV |
| **4. Decision** | A marginal abatement cost curve. Everything below the zero line pays for itself. |
| **5. Compliance** | Indicative CBAM export exposure and a BRSR disclosure readiness checklist |

## The three things that make this win

**1. It produces a MACC, not a pie chart.**
The marginal abatement cost curve is what actual climate consultants deliver at ₹2–10 lakh per engagement. Bar width is tonnes abated, bar height is ₹ per tonne, sorted cheapest first. Everything below the line is money the plant is currently leaving on the table. No student team will build this, and every judge with industry exposure will recognise it instantly.

**2. It says no.**
The engine evaluates and then *refuses* interventions that are technically valid but inadmissible — it will not tell a GMP pharma plant to use recycled blister foil, and it will not tell a Morbi tile kiln to burn briquettes. It caps recycled cotton at 25% because staple length falls with every recycling pass. A recommender that never says no cannot be trusted when it says yes, and this is the single clearest signal to a judge that the team understands the domain rather than the API.

**3. It is honest about its own uncertainty.**
Every emission factor carries a low/base/high band, and the band propagates to the headline: *24,069 tCO₂e (range 19,414–29,492, ±20.9%)*. The methodology panel lists limitations rather than hiding them. This is the difference between a demo and a tool an auditor could actually use.

## Demonstrated result — Tirupur knitwear dyeing unit

| | |
|---|---|
| Annual footprint | **24,069 tCO₂e** (19,414–29,492, ±20.9%) |
| Scope split | 28% Scope 1 · 8% Scope 2 · **64% Scope 3** |
| Largest leak point | **Purchased cotton yarn — 60.6%** of footprint, `critical` |
| Benchmark breaches | Electricity at p78, process heat at p76 of sector peers |
| Cash-positive portfolio | **17 interventions · ₹4.66 Cr/yr net benefit · ₹4.56 Cr capex · 12-month blended payback** |
| Abatement at no net cost | **25% of total footprint**; 42% available in total |
| Correctly refused | Nothing blocked in this sector; recycled cotton **capped at 25%** by spinning constraint |

The same engine runs ten Indian industrial sectors, each with its own benchmarks, demo plant and constraint set.

## Status

Working end-to-end: Python engine (6 modules), FastAPI service (7 endpoints), zero-dependency SVG frontend with hand-built Sankey and MACC. Ten sector profiles assessed clean with zero invariant violations. Runs entirely offline — no external API can fail during a demo.

## What it is not

It is a **screening tool**, not a BEE-accredited energy audit and not an assurance engine. Its economics are planning-grade estimates meant to rank options and justify getting a vendor quotation — not to replace one. It says so on every card, and it says so to judges.

---

*Read next: [`01-PRD.md`](01-PRD.md) for the full product definition, or [`10-PITCH-AND-QA.md`](10-PITCH-AND-QA.md) for the three-minute demo script and the hostile-question prep.*
