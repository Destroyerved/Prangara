# Competitive Landscape

*"Does this already exist?"* is the question that kills most hackathon projects. The honest answer here is: **the accounting layer exists and is crowded; the prescriptive layer for SMEs does not.** This document says exactly where we sit and where we would lose.

⚠️ Competitor positioning is based on public market understanding at build time. Pricing is indicative. Verify before using any specific claim commercially.

---

## 1. The landscape in four tiers

### Tier 1 — Enterprise carbon accounting platforms
*Persefoni, Watershed, Sweep, Plan A, Normative, Sphera*

| | |
|---|---|
| What they do | Full-scope carbon accounting, supplier engagement, disclosure-grade reporting (CSRD, SEC, CDP) |
| Who they sell to | Large corporates with a sustainability function |
| Price | Enterprise annual contracts, typically far beyond SME reach |
| Onboarding | Weeks, usually with implementation support |
| **Strength** | Audit-grade rigour, deep integrations, genuine assurance workflows |
| **Why they don't serve our user** | Priced and designed for an organisation with a dedicated team. An SME owner will never see a demo, let alone a contract. |
| **Do they prescribe?** | Partially — mostly target-setting and scenario modelling, not costed plant-level interventions with Indian payback |

### Tier 2 — ESG ratings and supply-chain assessment
*EcoVadis, CDP Supply Chain*

Assess and **score** suppliers. They are the source of the pressure our user feels, not the relief from it. A supplier who gets a poor EcoVadis score still has no idea which valve to fix. **Complementary, not competitive** — arguably a demand generator for us.

### Tier 3 — Indian carbon / ESG software
A real and growing set of Indian ESG reporting and carbon accounting vendors. ⚠️ This tier is the one to research hardest before making any claim; it is where a genuine overlap is most likely.

| | |
|---|---|
| **Strength** | India-aware, BRSR-native, reasonable pricing, local sales motion |
| **Typical focus** | **Reporting and disclosure workflow** — getting the BRSR filed |
| **Gap** | Still predominantly *accounting*: what is my number. Less commonly *prescription*: which twelve things should I do, in what order, at what ₹/tCO₂e |

### Tier 4 — Consultants and free spreadsheets

| Option | Cost | Turnaround | Problem |
|---|---|---|---|
| BEE-accredited energy audit | ₹2–10 lakh | 6–12 weeks | Cost; result is a static PDF; no material/Scope 3 view |
| GHG Protocol Excel tools | Free | Days of expert effort | Requires someone who already knows the standard; no benchmarks; no economics |
| Sector association guidance | Free | — | Generic; not plant-specific; not costed |

**The consultant is our real competitor and our best channel simultaneously.** We do not replace the audit — we make the screening pass 50× cheaper so the audit is spent where it matters.

---

## 2. Where we actually differ

| Capability | Enterprise SaaS | Indian ESG tools | Consultant | Free XLS | **Chakra** |
|---|---|---|---|---|---|
| Scope 1/2/3 inventory | ✅ | ✅ | ✅ | ◐ | ✅ |
| Indian grid factors by state | ◐ | ✅ | ✅ | ✗ | ✅ |
| **Peer benchmarking → leak detection** | ◐ | ✗ | ◐ | ✗ | **✅** |
| **Costed interventions (₹, payback, NPV)** | ◐ | ✗ | ✅ | ✗ | **✅** |
| **Marginal abatement cost curve** | ◐ | ✗ | ◐ | ✗ | **✅** |
| **Circular material substitution modelling** | ✗ | ✗ | ◐ | ✗ | **✅** |
| **Refuses inadmissible recommendations** | ✗ | ✗ | ✅ *(a good one)* | ✗ | **✅** |
| **Interaction de-rating on stacked savings** | ◐ | ✗ | ✅ | ✗ | **✅** |
| Uncertainty bands propagated | ◐ | ✗ | ◐ | ✗ | **✅** |
| CBAM exposure estimate | ◐ | ◐ | ✅ | ✗ | ✅ |
| Self-serve in 10 minutes | ✗ | ◐ | ✗ | ✗ | **✅** |
| SME-affordable | ✗ | ◐ | ✗ | ✅ | **✅** |

✅ strong · ◐ partial/varies · ✗ absent

---

## 3. The five defensible claims

We can defend exactly these, and should not overclaim beyond them.

**1. We answer "what should I do" rather than "what is my number."**
The market is saturated with accounting. The output of an accounting tool is a number; the output of Chakra is a **ranked, costed, constraint-checked action list**. That is the difference between a thermometer and a prescription.

**2. We produce a MACC for a plant that could never afford one.**
The marginal abatement cost curve is the standard artefact of professional climate consulting. Delivering it self-serve, in seconds, at SME scale is genuinely new at this price point.

**3. We model circular material substitution as a first-class lever, with physical ceilings.**
Most carbon tools are *energy* tools with a Scope 3 estimate bolted on. For an Indian auto-component or foundry SME, **purchased material is 60–70% of the footprint** and recycled aluminium is a 95% reduction sitting unexploited. We model the substitution, its price delta, *and* the alloy/blend ceiling that caps it.

**4. We refuse.**
No competitor at this price point will tell a pharma plant that recycled blister foil is inadmissible under GMP, or a Morbi kiln that briquettes will not fire glazed tile. A recommender that never says no cannot be trusted when it says yes.

**5. India-first, not India-localised.**
CEA state grid factors, Indian coal grade bands, Indian fuel prices in ₹, cluster-specific benchmarks for Tirupur and Coimbatore and Morbi, CBAM and BRSR hooks, INR and lakh/crore throughout. Not a Western tool with a currency setting.

---

## 4. Where we would lose — stated honestly

| Against | Why we lose | Response |
|---|---|---|
| Enterprise SaaS, for a large corporate | No assurance workflow, no audit trail infrastructure, no integrations, no SOC 2 | Don't compete. Different buyer entirely. |
| A good consultant, on accuracy | They measure; we estimate from declared data | Position as **screening before audit**, not instead of it |
| Indian ESG reporting vendors, on disclosure workflow | They do the filing; we do not | Complementary — we produce the reduction plan their report needs |
| Anyone, on benchmark authority | Our percentiles are literature-derived, not a surveyed corpus | Stated openly in the UI; fixed by the data flywheel (§5) |

**The honest summary:** we are the best screening-and-prescription layer for an Indian industrial SME, and we are not an audit, an assurance engine, or an enterprise platform. Claiming otherwise would be the fastest way to lose credibility with the one judge in the room who knows this market.

---

## 5. The moat, if this became a company

A hackathon prototype has no moat. The path to one:

1. **Benchmark corpus.** Every assessment improves the sector percentiles. After a few hundred plants in a cluster, *"you use 2.3× more energy per tonne than the median Tirupur dyeing unit"* is a claim nobody else can make. This is a genuine data network effect, and it is the only durable one here.
2. **Intervention outcome data.** Tracking which recommendations were implemented and what they actually delivered converts literature estimates into measured priors. Nobody else is collecting this at SME scale.
3. **Channel lock-in via corporates.** Once a large customer standardises its 300-supplier base on one format, switching is organisational, not technical.
4. **Constraint library.** The blocked/capped rules encode domain knowledge that took real expertise to assemble. It compounds and it is invisible to scrapers.

None of these exist today. Saying so is more persuasive than pretending otherwise.
