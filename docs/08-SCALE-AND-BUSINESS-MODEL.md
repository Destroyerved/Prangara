# Scalability and Business Model

---

## 1. Technical scalability

The engine is pure CPU arithmetic with no I/O and no model inference (persistence sits outside it, in the platform layer). A full assessment — 10 streams against 30 interventions with uncertainty propagation and de-rating — completes in well under 300 ms.

| Dimension | Current | Ceiling | Blocker |
|---|---|---|---|
| Assessments/hour, single small instance | — | ~10,000+ | None meaningful |
| Sectors | 10 | Unbounded | Benchmark data per sector |
| Interventions | 30 | Unbounded | Domain research per intervention |
| Emission factors | 31 (+15 state grids) | Unbounded | Sourcing and verification |
| Concurrent users | Stateless → horizontal | Unbounded | None |

**The real scaling constraint is not compute. It is domain data.** Adding a sector means assembling defensible intensity percentiles and a demo profile; adding an intervention means researching an abatement fraction, capex basis, savings model and physical ceiling. That is analyst work, not engineering work — which is exactly why it is defensible.

### 1.1 What breaks first at real scale

| # | Breaks | When | Fix |
|---|---|---|---|
| 1 | Literature benchmarks lose credibility against real cluster data | ~100 plants in one cluster | Replace percentiles with the measured corpus — this is the flywheel, not a problem |
| 2 | Manual data entry becomes the bottleneck | Immediately, in real use | Bill OCR / DISCOM portal ingestion |
| 3 | Stateless design blocks year-on-year tracking | First repeat customer | Add persistence — but only once there is a reason |
| 4 | Intervention library becomes too generic for specialist sectors | ~20 sectors | Sector-specific sub-libraries |
| 5 | Screening estimates diverge from implemented reality | First implementations | Outcome tracking → measured priors (this is where ML finally earns its place) |

---

## 2. The data flywheel

The only durable moat available here.

```
 more plants assessed
        │
        ▼
 better sector benchmarks ──────► sharper leak detection
        │                                  │
        ▼                                  ▼
 implementation outcomes ────────► measured abatement priors
        │                                  │
        ▼                                  ▼
 credible peer claims ◄─────────── better recommendations
        │
        └──────────► more plants assessed
```

After a few hundred plants in one cluster, *"you use 2.3× more energy per tonne than the median Tirupur dyeing unit"* becomes a claim no competitor can make and no scraper can copy. Peer comparison is also the strongest behavioural driver in the product — being below median is a status problem, not an environmental one, and status moves faster than conscience.

---

## 3. Go to market

Ranked by capital efficiency.

### Channel 1 — Corporate supplier cascade *(highest leverage)*
A large customer with a BRSR Core value-chain obligation hands Chakra to its 300 suppliers.

- **Acquisition cost per SME → ~zero.** One enterprise conversation onboards hundreds of plants.
- Data comes back in **one consistent, comparable format** — which is the corporate's actual problem.
- Instantly seeds the benchmark corpus within a real supply chain.
- **Who pays:** the corporate, for the supplier programme.

### Channel 2 — Cluster associations
Tirupur Exporters' Association, induction furnace associations, District Industries Centres, MSME-DFOs.

- One meeting reaches 200 plants running near-identical processes.
- Sector templates make the tool immediately relevant rather than generically applicable.
- **Cluster concentration is the structural reason SME distribution is tractable in India.**

### Channel 3 — Consultants and BEE-certified energy auditors
Anand (persona P3) brings 20 plants a year. Chakra becomes his screening layer; he sells the depth.

- We do not compete with the audit — we make the screening pass 50× cheaper so the audit is spent where it matters.
- **Who pays:** the consultant, per seat or per assessment.

### Channel 4 — Lenders and green finance
SIDBI, bank ESG lending desks. A lender assessing an efficiency term loan needs exactly what Chakra produces: costed abatement with payback.

- **Who pays:** the lender, for origination support — and this channel simultaneously solves the capital barrier that caps the realisation rate in [`06-IMPACT-MODEL.md`](06-IMPACT-MODEL.md).

### Channel 5 — Direct self-serve
The CBAM-panicked exporter who searches at 11pm. Lowest volume, highest intent, best product feedback.

---

## 4. Business model

⚠️ Indicative. Pricing is a hypothesis to test, not a finding.

| Tier | Who | Price | Includes |
|---|---|---|---|
| **Free assessment** | Any SME | ₹0 | Full engine, on-screen results, no export |
| **Report** | SME | ~₹5–15k per assessment | Branded PDF, BRSR-format extract, CBAM working sheet |
| **Consultant seat** | Anand | ~₹40–80k/yr | Unlimited plants, white-label export, assumption overrides |
| **Supplier programme** | Corporate | Annual contract | N supplier assessments, aggregated Scope 3 dashboard, comparable format |
| **Lender pack** | Bank/SIDBI | Per origination | Costed abatement pack formatted for credit assessment |

**Why free at the base tier.** The assessment *is* the acquisition. An SME who sees their own footprint decomposed for the first time is qualified in a way no ad can achieve, and every free assessment feeds the flywheel. The paywall sits at **export**, because export is where the value becomes transferable — the thing Rajesh forwards to the customer who asked.

### 4.1 Unit economics sketch

| | |
|---|---|
| Marginal cost per assessment | Effectively zero — sub-second CPU |
| Cost of a sector | Analyst research to assemble benchmarks + demo profile |
| Cost of an intervention | Analyst research for abatement, capex, savings model, ceilings |
| **Dominant cost** | **Domain analysis and factor verification, not engineering** |

Gross margin is software-like; the investment is a research library that compounds.

---

## 5. Roadmap

| Phase | Focus | Key additions |
|---|---|---|
| **Now (48h)** | Prove the engine | 10 sectors, 30 interventions, 31 factors, MACC, refusal layer, CBAM/BRSR panels |
| ~~**v1.1**~~ | Remove entry friction | ✅ save/resume, ✅ PDF export · ⬜ bill OCR, DISCOM ingest |
| **v1.2** | Make it transferable | BRSR-format export, CBAM working sheet, lender pack |
| ~~**v2.0**~~ | Close the loop | ✅ implementation tracking · ⬜ vendor marketplace |
| ~~**v2.1**~~ | Earn the benchmarks | ✅ shipped — shrinkage blending at n/(n+8), see doc 13 |
| **v3.0** | Measure, don't declare | Smart meter / SCADA integration; **ML on implementation outcomes** to learn real realisation rates by intervention, sector and plant size |

**Note on ML.** It appears in v3, not v1, and only where it has something real to learn: the gap between estimated and achieved abatement. Using it earlier would mean training on synthetic data to approximate physics we already compute exactly. That sequencing is a deliberate engineering judgement, not an omission — see [`05-INNOVATION-AND-FEASIBILITY.md`](05-INNOVATION-AND-FEASIBILITY.md) §2.2.

---

## 6. What would have to be true

The claims in this document depend on four things we have not proved:

1. **SMEs will enter their own data.** Ten inputs is few, but it is not zero. If they will not, Channel 1 (corporate mandate) becomes the only viable route.
2. **Identified savings convert to implemented savings at a meaningful rate.** Everything in the impact model rests on this.
3. **Someone pays for export.** The free tier is only a strategy if the paid tier converts.
4. **Benchmarks can be earned before credibility is spent.** Literature percentiles work for a pilot; they will not survive a sophisticated customer at scale.

Naming these is not hedging. A business model that cannot state its own load-bearing assumptions has not been thought through.
