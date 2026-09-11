# Real-World Impact Model

The PS states three impact goals. This document takes each one and attaches a computed number rather than an assertion — then states plainly what would have to be true for those numbers to hold.

> **Impact goals from the PS**
> • Makes emission sources visible and actionable for smaller businesses
> • Drives adoption of circular practices through concrete, costed recommendations
> • Supports compliance with emerging carbon regulations

---

## 1. Impact at one plant — measured, not assumed

Every figure below is engine output for the Tirupur knitwear dyeing demo profile (2,400 t/yr output, ₹34 Cr revenue, 180 employees).

| Metric | Value |
|---|---|
| Baseline footprint | **24,069 tCO₂e/yr** (range 19,414–29,492) |
| Scope split | 28% / 8% / **64%** (S1/S2/S3) |
| Leak points found | 3 — one `critical`, two `moderate` |
| Recoverable by reaching sector median | **2,616 tCO₂e/yr** |
| Interventions matched | 21 |
| **Cash-positive subset** | **17 interventions** |
| **Abatement at no net cost** | **6,013 tCO₂e/yr — 25% of footprint** |
| Capex required | ₹4.56 Cr |
| **Net annual benefit** | **₹4.66 Cr/yr** |
| Blended payback | **12 months** |
| Total abatement available (incl. net-cost options) | 10,210 tCO₂e/yr — 42% |
| Quick wins (payback ≤2 yr, difficulty ≤2) | 7 interventions · ₹25.9 L capex · ₹56.7 L/yr · 5-month payback |

**Interpretation:** the plant can remove a quarter of its carbon while *making* ₹4.66 crore a year, and can start on ₹25.9 lakh of quick wins that pay back in five months. The remaining 17% of available abatement costs money — and the tool says so rather than burying it.

### 1.1 Across all ten sectors

| Sector | Footprint tCO₂e | Cash-positive abatement | Net benefit ₹/yr | Payback |
|---|---|---|---|---|
| Textile dyeing | 24,069 | 25.0% | ₹4.66 Cr | 12 mo |
| Foundry / casting | 18,786 | 57.9% | ₹5.51 Cr | 13 mo |
| Ceramics | 26,075 | 28.4% | ₹9.08 Cr | 13 mo |
| Food processing | 7,623 | 60.6% | ₹3.92 Cr | 16 mo |
| Auto components | 11,807 | 48.3% | ₹2.66 Cr | 13 mo |
| Pharma formulation | 7,127 | 50.3% | ₹3.55 Cr | 22 mo |
| Plastic moulding | 8,053 | 37.6% | ₹1.90 Cr | 17 mo |
| Paper / packaging | 13,960 | 36.9% | ₹4.34 Cr | 10 mo |
| Fabrication | 5,169 | 51.1% | ₹1.41 Cr | 12 mo |
| Chemicals | 7,458 | 36.0% | ₹1.89 Cr | 23 mo |

**Median cash-positive abatement across sectors: 43% of footprint, at a blended payback of 12–13 months.**

That consistency is itself a finding: across ten different Indian industrial processes, roughly **40% of the carbon is sitting behind a positive business case that nobody has computed.**

---

## 2. Scaled impact — with the arithmetic shown

⚠️ **This section is a model, not a measurement.** Every assumption is named so it can be argued with.

### 2.1 Assumptions

| Assumption | Value | Basis / confidence |
|---|---|---|
| Mean footprint per target SME | 13,000 tCO₂e/yr | Mean of the ten demo profiles. **Medium** — demo plants are mid-sized; the real long tail is smaller. |
| Cash-positive abatement identified | 40% of footprint | Median across sectors. **Medium-high** — engine output. |
| **Realisation rate** | **25%** | Fraction of identified cash-positive abatement actually implemented within 2 years. **Low confidence — this is the load-bearing assumption.** |
| Effective abatement per plant | 13,000 × 0.40 × 0.25 = **1,300 tCO₂e/yr** | |

### 2.2 Scenarios

| Horizon | Plants assessed | Abatement realised | Equivalent to |
|---|---|---|---|
| Hackathon → pilot | 50 | 65,000 tCO₂e/yr | — |
| Year 1, two clusters | 500 | 650,000 tCO₂e/yr | ~140,000 cars off the road |
| Year 3, ten clusters | 5,000 | 6.5 M tCO₂e/yr | — |

**And the economic mirror:** at ~₹3.5 Cr median net annual benefit per plant, 500 plants implementing a quarter of their identified portfolio is on the order of **₹440 Cr/yr of retained margin in the Indian MSME sector.**

### 2.3 The assumption most likely to be wrong

**The 25% realisation rate.** Identifying an opportunity is not implementing one. Real barriers:

- Capital access — even a 12-month payback needs the 12 months of capital up front
- Attention — the owner has a business to run
- Vendor trust — a good recommendation with a bad contractor fails
- Behavioural regression — idle-load savings decay without metering

**If realisation is 10% rather than 25%, every number above falls by 60%.** It would still be a worthwhile product. Stating this is more credible than defending 25%.

**What would raise realisation** — and is therefore the v2 roadmap: lender pack export (solves capital), vendor marketplace with three quotes (solves trust), and implementation tracking (solves attention and regression).

---

## 3. Impact against each stated PS goal

### Goal 1 — "Makes emission sources visible and actionable for smaller businesses"

| Before | After |
|---|---|
| "Our carbon is probably the boiler" | 24,069 tCO₂e, decomposed into 8 streams with shares and uncertainty |
| No comparison | Peer percentile on three metrics; 3 leak points with severity |
| No sense of size | **64% is Scope 3** — the opposite of the owner's intuition |

**The single most valuable output is often a surprise:** for the auto-component and foundry demos, the plant's own operations are efficient and its **purchased steel or aluminium is the problem**. No energy-only tool would ever tell them that.

### Goal 2 — "Drives adoption of circular practices through concrete, costed recommendations"

Circular interventions in the library: recycled aluminium and steel, rPET, recycled board, blended cement, recycled cotton, in-house regrind, foundry sand reclamation, solvent recovery, closed-loop dye water, anaerobic digestion, industrial symbiosis, waste segregation.

Each carries: tonnes abated, capex, net annual benefit, ₹/tCO₂e, payback, NPV, difficulty, disruption days, confidence, evidence, caveats, and a physical statement of what changes.

**The conversion mechanism is the negative LCOA.** "Switch to recycled aluminium" is an appeal. "Switch 448 tonnes of aluminium, save ₹1.79 Cr/yr and 5,560 tCO₂e, capex ₹11 lakh" is a purchase order.

### Goal 3 — "Supports compliance with emerging carbon regulations"

- **CBAM** — indicative exposure in ₹, with precursor emissions explicitly excluded and declared
- **BRSR** — readiness checklist with per-item status and an explicit statement that assurance is out of scope
- **Sector flags** — ZLD, EPR, hazardous waste, fly ash utilisation surfaced per sector

**Compliance is the wedge, not the product.** It gets the meeting; the MACC closes it.

---

## 4. Co-benefits not counted in the carbon number

Real but deliberately excluded from headline figures, because inflating a carbon claim with adjacent benefits is how impact reporting loses credibility:

| Co-benefit | Mechanism |
|---|---|
| **Air quality** | Coal→biomass and reduced diesel cut PM and SOx locally — the health benefit accrues to the workers and the neighbourhood |
| **Water** | Closed-loop dye water cuts freshwater draw in water-stressed Tirupur |
| **Landfill diversion** | Waste segregation and AD divert tonnage from municipal landfill |
| **Industrial symbiosis** | Fly ash and slag become another industry's input — two footprints fall |
| **Export competitiveness** | A CBAM-ready supplier keeps the contract a non-compliant one loses |
| **Worker safety** | Steam line insulation removes a genuine burn hazard |
| **Energy security** | Genset displacement reduces exposure to diesel price and outages |

---

## 5. What honest success looks like at 48 hours

Not "we will decarbonise Indian industry." The credible claim is narrower and stronger:

> **We built a working tool that takes ten inputs an SME already has, finds where their carbon leaks relative to their own sector, and returns a ranked, costed, constraint-checked plan — demonstrating on ten real Indian industrial sectors that roughly 40% of an SME's footprint sits behind a positive business case nobody has computed for them.**

That is a claim we can fully defend with the artefact in the room.
