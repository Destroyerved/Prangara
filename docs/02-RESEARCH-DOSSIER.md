# Research Dossier

Everything the product rests on, with provenance and an honest confidence rating.

> **Verification discipline.** Figures below are drawn from published literature and public policy documents as understood at build time. Anything marked ⚠️ must be re-verified against the primary source before commercial use. A hackathon build is allowed to use literature values; it is not allowed to pretend they are primary measurements.

---

## 1. Market

### 1.1 Size of the addressable problem

India has on the order of **63 million MSMEs**, contributing roughly **30% of GDP** and **~45% of exports**. Industrial MSMEs — the subset with a process, a boiler or a furnace, and a material bill — are the target. Even a conservative slice of registered manufacturing MSMEs is a market in the hundreds of thousands of plants.

The relevant number is not "how many SMEs exist" but **how many are under carbon pressure today**. Three forcing functions, in descending order of immediacy:

| Forcing function | Who it hits | Timing | Confidence |
|---|---|---|---|
| **CBAM** — EU Carbon Border Adjustment Mechanism | Exporters of iron & steel, aluminium, cement, fertiliser, electricity, hydrogen | Transitional reporting ran Oct 2023–Dec 2025; **definitive regime from Jan 2026** ⚠️ verify current phase and certificate price | High |
| **BRSR / BRSR Core** — SEBI | Top listed companies, cascading to their **value chain** i.e. SME suppliers | Phased; value-chain disclosure already driving supplier data requests | High |
| **Green finance** — SIDBI, bank ESG lending | SMEs seeking term loans for efficiency capex | Ongoing | Medium |

**The wedge is CBAM.** It is the only one of the three with a legal deadline, a monetary penalty, and a customer actively demanding the data. An Indian foundry exporting castings to Germany has a problem this quarter. That is a buyer, not a prospect.

### 1.2 Industrial clusters targeted

Cluster concentration is what makes SME distribution tractable — one association meeting reaches 200 plants running near-identical processes.

| Cluster | Sector | Why it matters |
|---|---|---|
| Tirupur, TN | Knitwear dyeing | Export-heavy, already under ZLD regulation, buyer pressure from EU brands |
| Coimbatore / Rajkot / Belgaum | Foundry | **CBAM-exposed**; high electricity intensity; aluminium substitution upside |
| Morbi, GJ | Ceramic tiles | Extremely thermal-intensive; gas-fired; hard-to-abate showcase |
| Ludhiana, PB | Light engineering, hosiery | Steel-heavy Scope 3; poor grid reliability → diesel |
| Ankleshwar / Vapi, GJ | Chemicals | Solvent recovery upside; hazardous waste cost |
| Pune / Chakan, MH | Auto components | OEM customers cascading BRSR Core requests |

---

## 2. Regulatory research

### 2.1 CBAM (EU Regulation 2023/956)

- Covers **embedded emissions** in imported goods across cement, iron & steel, aluminium, fertilisers, electricity and hydrogen. ⚠️ Verify the current Annex I CN code list — scope has been revised and may expand.
- Transitional period (reporting only) **1 Oct 2023 – 31 Dec 2025**; definitive regime with certificate surrender **from 1 Jan 2026**. ⚠️ Confirm current status.
- Embedded emissions comprise **direct** emissions plus, for some goods, **indirect** (electricity) emissions, plus **precursor** emissions.
- Requires **installation-level** data. Default values are available but are deliberately punitive relative to actual verified data — which is precisely the commercial incentive to measure.

**Design consequence.** Chakra computes exposure as `(Scope 1 + Scope 2) × EU export share × reference price` and **explicitly excludes precursor emissions**, because precursor rules require supplier-specific data the tool does not hold. Guessing it and presenting it as a number would be the exact failure mode the product exists to prevent. The UI says this in the panel.

### 2.2 BRSR and BRSR Core (SEBI)

- BRSR is a mandated sustainability disclosure for the largest listed Indian companies.
- **BRSR Core** specifies a subset of KPIs requiring **reasonable assurance**, and extends disclosure expectations into the **value chain**.
- Mechanism of relevance: an unlisted MSME is never directly regulated — but its listed customer needs value-chain numbers, so the request arrives as a **purchase-order condition**, not a regulation.

**Design consequence.** The BRSR panel is a readiness checklist, and it is explicit that Chakra produces working papers, **not assurance**. Claiming assurance would be a material misrepresentation.

### 2.3 Other Indian instruments referenced

| Instrument | Relevance |
|---|---|
| **CEA CO₂ Baseline Database** | Source of the Indian grid emission factor; regional variation drives Scope 2 |
| **PAT scheme (BEE)** | Source of documented Indian industrial energy savings; evidence base for several interventions |
| **Plastic Waste Management Rules** | EPR registration and **recycled content targets** — makes rPET substitution a compliance move, not just a carbon move |
| **Fly ash utilisation notification** | Legal basis for the mature ash-to-cement symbiosis market |
| **Hazardous Waste Rules (CPCB)** | Used foundry sand and solvent disposal liability |
| **Solid Waste Management Rules** | Authorised recycler framework underpinning waste segregation |
| **IS 1489 / IS 455** | Blended cement standards — the technical basis for the substitution being permissible |
| **IEC 60034-30-1** | Motor efficiency classes (IE1–IE5) |

---

## 3. Emission factor research

31 factors across five groups, plus 15 state grid variants. Each carries `value`, `low`, `high`, `unit`, `scope` and `source`.

### 3.1 Electricity — the highest-leverage single choice

| Factor | Value | Band | Source |
|---|---|---|---|
| India national grid | 0.716 tCO₂e/MWh | 0.680–0.760 | CEA CO₂ Baseline Database ⚠️ re-check latest version |
| State variants | 0.48 (KL) – 0.88 (WB) | — | Derived from CEA regional mixes |

**Finding:** state choice can move a Scope 2 result by ~40%. West Bengal runs roughly 1.8× Kerala per unit consumed. Any tool using a single national number for a country this electrically heterogeneous is introducing a larger error than most of its other assumptions combined. **This is why state is a required field.**

The national factor is **declining year on year** as renewable share grows — which means a Scope 2 reduction claim must state its vintage or it is not comparable across years.

### 3.2 Fuels

| Fuel | Factor | Unit | Band | Note |
|---|---|---|---|---|
| Diesel | 2.68 | kgCO₂e/l | 2.60–2.75 | DEFRA stationary combustion |
| Natural gas | 2.02 | kgCO₂e/Sm³ | 1.92–2.12 | DEFRA gross CV |
| LPG | 2.94 | kgCO₂e/kg | 2.88–3.00 | DEFRA |
| Furnace oil | 3.15 | kgCO₂e/kg | 3.05–3.25 | IPCC 2006 Vol.2 residual fuel oil |
| **Indian coal** | **1.70** | **tCO₂e/t** | **1.45–2.00** | IPCC adjusted for Indian ash/NCV |
| Biomass briquette | 0.06 | tCO₂e/t | 0.02–0.12 | **CH₄/N₂O only** |

**Finding — Indian coal has the widest band in the entire database (±16%).** Indian non-coking coal is graded G1–G17 with wildly varying ash content and net calorific value. A tool that uses a single global "coal" factor for an Indian plant is making its largest error on its largest Scope 1 stream. The band is carried through rather than hidden.

**Finding — biogenic carbon is a trap.** Under GHG Protocol, biogenic CO₂ from biomass combustion is reported **separately** and excluded from the Scope 1 total; only CH₄ and N₂O from combustion are counted. Many student tools set biomass to zero with no explanation, which is *numerically* close but *methodologically* indefensible and immediately visible to anyone who knows the standard. Chakra computes the biogenic memo line (≈1.55 tCO₂/t) and discloses it.

### 3.3 Materials — where the circular economy actually lives

| Material pair | Primary | Secondary | Reduction |
|---|---|---|---|
| **Aluminium** | 13.0 tCO₂e/t | 0.60 | **~95%** |
| Steel | 2.20 | 0.55 | ~75% |
| Cotton yarn | 5.50 | 1.80 | ~67% |
| PET | 3.00 | 1.30 | ~57% |
| Cement (OPC→blended) | 0.85 | 0.55 | ~35% |
| Paper/board | 1.25 | 0.80 | ~36% |
| Glass | 1.10 | 0.70 | ~36% |

**Finding — recycled aluminium is the single largest circular lever available to an Indian SME.** ~95% embodied carbon reduction *and* a lower price per tonne. It is cash-positive and carbon-massive simultaneously. Any foundry or auto-component plant buying primary aluminium has this sitting unexploited.

**Counter-finding — the ceiling is specification, not willingness.** Alloy trace-element limits, staple length in recycled cotton, food-contact rules for rPET, and OEM material certification for safety-critical steel all cap the substitutable share far below 100%. This is why `max_substitution_pct` exists, and why a model without it produces recommendations the process physically cannot accept.

### 3.4 Transport and waste

Rail freight is ~0.022 kgCO₂e/t·km against road at ~0.095 — roughly **4× better per tonne-km**. Modal shift is a large, low-capex Scope 3 lever for bulk inbound, blocked by lead time and safety stock rather than cost.

Organic waste to landfill at 0.58 tCO₂e/t is dominated by **CH₄ from anaerobic decay** under AR6 GWP100. Anaerobic digestion scores **negative** (−0.12) because it both avoids that methane and displaces fossil gas — it counts twice.

---

## 4. Benchmark research

Sector intensity percentiles (p25/p50/p75) across ten sectors on three metrics: electricity kWh/t, thermal GJ/t, and gate-to-gate tCO₂e/t.

⚠️ **Honest status:** these are **indicative screening percentiles** compiled from published sector energy-intensity literature and cluster study ranges. They are adequate to rank a plant and flag outliers. They are **not** a BEE-accredited benchmark set, and the product says so on the leak panel.

### 4.1 The basis error we found and fixed

Our first benchmark set mixed **cradle-to-gate** values (some sectors) with **gate-to-gate** values (others) and compared both against a cradle-to-gate computed intensity. The textile demo came out at 8.02 tCO₂e/t against a "p75" of 3.4 — reporting a perfectly ordinary plant as catastrophically bad.

**Resolution:** benchmark **only** gate-to-gate (Scope 1+2) intensity, because that is what published sector energy benchmarks measure and it is the only part the plant directly controls. Cradle-to-gate is reported alongside but never benchmarked — a plant that buys more material per tonne of product is not thereby running a worse factory. Scope 3 dominance is surfaced through the structural-hotspot rule instead.

This is the most important methodological correction in the build, and it is worth stating to judges because **mixing the two bases is the single most common error in SME carbon tools.**

---

## 5. Intervention evidence base

30 interventions, each with a confidence rating and an evidence note.

| Confidence | Count | Meaning |
|---|---|---|
| `high` | 13 | Well-evidenced across many Indian SME deployments |
| `medium` | 15 | Evidenced but strongly site-sensitive |
| `low` | 2 | Promising, thin Indian evidence base |

### 5.1 Selected findings

**Compressed air leaks are the cheapest tonne in almost every factory.** Industrial systems typically lose 20–30% of compressor output to leaks, and compressed air is commonly 10–15% of plant electricity. Ultrasonic survey plus tagged repair pays back in weeks with zero production stoppage. Modelled at 4% of plant electricity (2.0–6.5%).

**Open access is a carbon move, not a cash move.** Renewable procurement via open access can cut Scope 2 by 25–80% at near-zero capex — but the plant *still buys the electricity*, so the cash case is only the tariff differential, and cross-subsidy plus additional surcharge can erase it entirely. Modelling it as "half your electricity bill disappears" overstates the business case by roughly 20×. This drove the `savings_model` design.

**Fuel switching to biomass costs money.** Coal at ₹6,500/t and 15.9 GJ/t is ~₹409/GJ. Briquette at ₹7,200/t and 15.0 GJ/t is ~₹480/GJ. The switch is **~₹71/GJ more expensive**. It remains the largest Scope 1 lever available to a thermal-heavy SME — and it is not free. Reporting it as free would be the most consequential lie the tool could tell.

**Behavioural savings regress.** Idle-load elimination is nearly free and delivers ~5% of electricity, but it decays within 6–9 months without sub-metering and a named owner. Captured as a caveat rather than quietly ignored.

---

## 6. Open research questions

| # | Question | Impact if wrong | Mitigation in v1 |
|---|---|---|---|
| R1 | Are the sector benchmark percentiles representative of actual Indian clusters? | Peer percentiles misleading | Labelled as indicative; caveat on panel; replaceable JSON |
| R2 | Current CBAM certificate price and CN code coverage | Exposure figure off | Reference price is a named constant; caveat requires user confirmation |
| R3 | Latest CEA grid factor vintage | Scope 2 off by a few % | Band carried; source named |
| R4 | Are recycled-material price deltas stable? | Cash case shifts | Prices in JSON, user-overridable; flagged as volatile for briquette |
| R5 | Real blend ceilings per alloy/grade | Over- or under-recommending substitution | Conservative caps; stated on the card |

**None of these are hidden.** Every one appears in the product's own limitations panel. A tool whose stated uncertainties match its actual uncertainties is more useful than one that projects false precision — and considerably harder to take apart in Q&A.
