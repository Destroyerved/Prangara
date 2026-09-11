# Innovation, Feasibility and Risk

---

## Part 1 — Innovation

### 1.1 What is genuinely novel

Not everything here is novel, and claiming otherwise invites a judge to find the weak claim and discard the strong ones with it. Sorted by how defensible the claim is.

| # | Claim | Novelty | Defence |
|---|---|---|---|
| **I1** | **Benchmark-relative leak detection** | **High** | Defining a "leak" as intensity above sector p75 — rather than as a large absolute number — makes the detector meaningful without sensors. Three complementary rules catch outliers, large-and-above-median streams, *and* structural Scope 3 hotspots that intensity alone would miss. |
| **I2** | **Self-serve MACC at SME scale** | **High** | The marginal abatement cost curve is a professional consulting artefact. Producing one automatically, in seconds, from ten inputs, at SME price is new at this tier. |
| **I3** | **Constraint-aware refusal** | **High** | An engine that *evaluates and then refuses* — GMP blocking recycled pharma packaging, kiln chemistry blocking briquettes, staple length capping recycled cotton at 25% — inverts the usual recommender failure mode. |
| **I4** | **Interaction de-rating** | **Medium-high** | Applying each intervention to the residual stream rather than the original baseline. Standard practice in professional energy auditing; almost never implemented in software at this level. |
| **I5** | **Savings-model taxonomy** | **Medium-high** | Distinguishing `avoided_purchase` from `tariff_delta` from `fuel_switch` prevents the 20× overstatement that comes from treating "50% of electricity abated" as "50% of the electricity bill saved". |
| **I6** | **Uncertainty propagated to the headline** | **Medium** | Bands carried through every operation rather than collapsed at the first multiplication. |
| **I7** | Circular substitution as a first-class lever | Medium | Modelling primary→secondary material switching with price deltas and physical ceilings, rather than treating Scope 3 as a footnote. |
| **I8** | Scope 1/2/3 accounting per GHG Protocol | **None** | This is table stakes. We do not claim it as innovation. |
| **I9** | Sankey and dashboard | **None** | Presentation, not innovation. |

### 1.2 The central insight

> **A recommendation is only useful if it is ranked by the thing the user optimises. An SME optimises cash.**

Almost every carbon tool ranks by tonnes abated. That ordering is useless to the person who has to sign the cheque, because the biggest-tonnage option is frequently the most expensive one. Ranking by **levelised cost of abatement** produces a completely different — and actionable — ordering, and it surfaces the finding that matters most:

**A quarter of this plant's footprint can be removed at negative cost.** Not "should be removed for the planet" — *removed while making money*. That reframing is the product.

### 1.3 The second insight — saying no is a feature

Recommender systems are optimised to recommend. The failure mode is a plausible-looking suggestion that is inadmissible in context. In an industrial setting one such recommendation destroys trust permanently — an owner who is told to put recycled resin in a GMP blister pack will never open the tool again.

Chakra ships three refusal mechanisms:

- **Blocked** — evaluated, refused, reason shown *(pharma rPET; ceramics briquette)*
- **Capped** — allowed at a reduced share, reason shown *(food rPET 35%; auto steel 45%)*
- **Physical ceiling** — declared per intervention *(recycled cotton 25%, alloy limits, etc.)*

The UI shows these under **"Considered and rejected"**. It is the most trust-building screen in the product.

---

## Part 2 — Technical feasibility

### 2.1 Feasibility rating: **very high**

PS10 has the best feasibility profile of any problem statement in the set, for one structural reason: **zero external runtime dependencies.** No satellite API, no live grid feed, no IoT stream, no third-party rate limit. Everything needed is public reference data that can be embedded in the repository.

| Risk class | Typical hackathon project | Chakra |
|---|---|---|
| External API fails on stage | High | **None — nothing external is called** |
| Rate limit / auth expiry | High | **None** |
| Data licensing | Medium | Public factors, cited |
| ML training time | High | **No model training required** |
| Venue wifi | High | **Runs fully offline** |

### 2.2 Why no machine learning

The PS suggests "AI/ML recommendation models". We deliberately did not use one, and this is a defensible engineering decision rather than an omission:

1. **No training data exists.** There is no labelled corpus of Indian SME plants and their implemented interventions. A model trained on synthetic data learns the synthesiser's assumptions.
2. **The physics is known.** Emission factors and abatement fractions come from thermodynamics and published LCI, not from pattern-matching. Replacing a correct deterministic calculation with an approximation is a downgrade.
3. **Explainability is a requirement, not a nice-to-have.** An auditor asking "why 412 tonnes?" must get a derivation, not a feature-importance plot.
4. **Where ML genuinely belongs is v2:** learning actual abatement realisation rates from implementation outcomes, and clustering plants for better peer grouping. Both need data we do not yet have.

**Stated to judges as:** *"We use a deterministic, auditable model because carbon accounting has a right answer and a standard that defines it. ML enters when we have implementation-outcome data worth learning from — that is v2, and here is exactly what it would learn."*

### 2.3 Build complexity — actual

| Component | Lines | Complexity | Status |
|---|---|---|---|
| `factors.py` — loading, units, uncertainty | ~180 | Medium | ✅ |
| `footprint.py` — Scope 1/2/3, streams, intensities | ~230 | Medium | ✅ |
| `leaks.py` — 3 detection rules, percentiles | ~290 | Medium | ✅ |
| `macc.py` — matching, economics, de-rating | ~430 | **High** | ✅ |
| `assess.py` — orchestration, Sankey, compliance | ~250 | Low | ✅ |
| `app.py` — FastAPI, 7 endpoints | ~140 | Low | ✅ |
| Frontend — SVG Sankey + MACC, no deps | ~480 | Medium-high | ✅ |
| Reference data — 31 factors, 30 interventions, 10 sectors | ~1,100 (JSON) | **The real work** | ✅ |

**The honest assessment:** the code is not hard. The *domain data* is where the effort and the differentiation live. Any competent team can write a MACC calculation in four hours; assembling 30 interventions with defensible abatement fractions, capex bases, savings models, physical ceilings and sector constraints is what takes the time and is what a judge cannot replicate by reading the screen.

### 2.4 Performance

Full assessment for a 10-stream plant against 30 interventions: well under 300 ms, entirely CPU-bound arithmetic. No database, no network, no model inference. Scales linearly; a single small instance handles thousands of assessments per hour.

---

## Part 3 — Risks

### 3.1 Product and credibility risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R1** | A judge with domain expertise challenges a specific emission factor | **High** | Medium | Every factor carries a band and a named source. Answer: *"here is the range and the source; the point estimate is screening-grade and the UI says so."* Never defend a point estimate. |
| **R2** | "This is just a calculator" | Medium | **High** | Demonstrate the three things a calculator cannot do: benchmark-relative detection, de-rating, refusal. |
| **R3** | Benchmarks are literature-derived, not surveyed | **Certain** | Medium | Stated in the UI and in this document. Framed as the v2 data flywheel. |
| **R4** | Economics look too good | Medium | **High** | Already caught and fixed once — the pre-fix model showed ₹10.5 Cr/yr benefit on a ₹34 Cr plant. Savings models and de-rating brought it to a credible ₹4.66 Cr. **Telling this story is itself evidence of rigour.** |
| **R5** | CBAM details out of date | Medium | Medium | Reference price is a named constant; panel carries a "confirm before acting" caveat. |
| **R6** | Garbage inputs → confident garbage outputs | High in real use | Medium | v1 accepts declared data. v2 adds bill-based validation and cross-checks against sector plausibility ranges. |

### 3.2 The risk we already hit

**During build, the model claimed 18 of 21 interventions were profitable, delivering ₹10.5 Cr/yr of net benefit on a ₹34 Cr revenue plant — 31% of turnover.** That is obviously wrong, and three separate bugs caused it:

1. Every energy intervention assumed the whole stream cost disappeared, including open access (where you still buy the power) and fuel switching (where you still buy fuel).
2. Material substitution ignored the physical blend ceilings declared in its own caveat text — recommending a 52% recycled-cotton switch when staple length caps it near 25%.
3. Seven electricity interventions stacked additively to ~99% of the meter.

After fixing all three: **₹4.66 Cr/yr, 12-month blended payback, 25% of footprint** — and the biomass fuel switch correctly flipped from "free" to a **net cost of ₹1,630/tCO₂e**.

This is worth saying out loud in the pitch. *"Our first model said this plant could save ₹10 crore a year. We didn't believe it, we found three modelling errors, and here is what we fixed"* demonstrates more engineering judgement than any feature.

### 3.3 Ethical risk

**Recommending something that damages a business is worse than recommending nothing.** Specific guards:

- Difficulty and `disruption_days` on every card — the user sees the operational cost
- Caveats that state failure modes, not just benefits
- Blocking and capping for inadmissible options
- Confidence ratings, including `low` where the Indian evidence base is thin
- No claim of assurance, anywhere

**And the inverse:** overstating savings to make a demo impressive would, at scale, cause SMEs to commit capex they cannot recover. The corrections in §3.2 were made for that reason, not for the demo.
