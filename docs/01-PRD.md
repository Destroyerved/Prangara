# Chakra — Product Requirements Document

**Version** 1.0 · **Status** Built and demonstrable · **Problem statement** HackOut'26 PS10

---

## 1. Problem definition

### 1.1 The problem statement, as given

> Small and medium industries often don't know exactly where their carbon footprint originates or what circular alternatives are available. This problem asks for a tool where a business inputs process data (energy source, materials, waste streams) and the system identifies top emission sources, then recommends specific circular interventions (e.g., alternative materials, recycling loops, process changes) along with estimated cost and CO2 savings.

### 1.2 The reading that matters

Two readings of "leak-point detector" are possible and only one is correct.

- ❌ **Literal:** a sensor system detecting physical gas leaks. This is not what the PS asks for — it says the business *inputs process data*, not that the system reads instruments.
- ✅ **Correct:** the point in a process where carbon escapes the business unnecessarily. "Unnecessarily" is the load-bearing word, and it is only meaningful **relative to what comparable plants achieve**.

This single interpretation choice drives the entire architecture. A detector built on the literal reading needs hardware nobody has. A detector built on the correct reading needs **sector benchmarks**, which is a data problem we can solve.

### 1.3 Why existing behaviour fails

| Actor | What they do today | Why it fails |
|---|---|---|
| SME owner | Nothing, or a one-off consultant audit at ₹2–10 lakh | Cost; 6–12 week turnaround; result is a PDF that goes in a drawer |
| Large customer | Emails a spreadsheet to their supplier | Supplier cannot fill it; data returned is guessed or blank |
| Consultant | Excel model rebuilt per client | Not scalable; no benchmark corpus; no reproducibility |
| Enterprise SaaS | Sells to the customer, not the supplier | ₹40L+/yr, assumes a sustainability team exists |

The gap is a **self-serve, sector-aware, prescriptive** tool at SME price and SME effort.

---

## 2. Goals and non-goals

### 2.1 Goals

| # | Goal | Measure of success |
|---|---|---|
| G1 | Produce a defensible Scope 1/2/3 inventory from data an SME already has | ≤ 10 input fields per stream; every output carries a source and a band |
| G2 | Identify *where* carbon leaks, relative to peers | Every leak carries a rule, a severity, a percentile and a tonnes-to-median figure |
| G3 | Recommend **costed** circular interventions | Every recommendation carries ₹/tCO₂e, capex, payback, NPV and a physical statement |
| G4 | Make the decision obvious | One MACC; everything below the zero line is cash-positive |
| G5 | Connect carbon to a commercial deadline | CBAM exposure and BRSR readiness computed, not asserted |
| G6 | Be trustworthy | Refuse inadmissible recommendations; propagate uncertainty; publish limitations |

### 2.2 Explicit non-goals

- **Not** a BEE-accredited energy audit. Screening grade, stated as such.
- **Not** an assurance or verification engine. It produces working papers; a licensed assurer signs them.
- **Not** a carbon credit issuer or trading platform.
- **Not** an IoT/sensor platform in v1. Meter integration is a v2 wedge, not a v1 requirement.
- **Not** a generic global tool. India-first by design: CEA grid factors, Indian fuel prices, Indian cluster benchmarks, INR throughout, Indian regulatory hooks.

---

## 3. Users

Summarised here; full personas in [`03-USERS-AND-PERSONAS.md`](03-USERS-AND-PERSONAS.md).

| Persona | Role | Primary job-to-be-done | Success looks like |
|---|---|---|---|
| **Rajesh** — SME owner/MD | Decision maker | "My EU buyer wants carbon numbers and I have two weeks" | A credible number and a plan he can show, in one sitting |
| **Priya** — plant/works manager | Implementer | "Which of these do I start on Monday?" | A ranked shortlist filtered to difficulty ≤ 2 and payback < 2 yr |
| **Anand** — sustainability consultant | Power user / channel | "I need to do 20 of these a month, not 2" | Reproducible engine, exportable working papers |
| **Meera** — corporate ESG lead (customer) | Demand creator | "I need Scope 3 data from 300 suppliers" | Consistent, comparable, auditable supplier submissions |
| **Regulator / lender** | Verifier | "Is this claim credible?" | Cited factors, stated uncertainty, declared exclusions |

---

## 4. Functional requirements

### FR-1 — Plant profile intake
- **FR-1.1** Sector selection from a fixed taxonomy of 10 Indian industrial sectors.
- **FR-1.2** State selection, driving the Scope 2 grid emission factor.
- **FR-1.3** Activity capture across five stream families: electricity (kWh/yr), fuels (native units per fuel), materials (t/yr), waste (t/yr), freight (tonne-km/yr).
- **FR-1.4** Scale context: annual output (t), revenue (₹ Cr), headcount.
- **FR-1.5** Economic overrides: electricity tariff (₹/kWh), cost of capital (%), EU export share (%).
- **FR-1.6** A prefilled, realistic demo profile per sector, so a first-time user sees the output before doing any typing.

### FR-2 — Footprint engine
- **FR-2.1** Compute Scope 1, 2 and 3 per GHG Protocol Corporate Standard.
- **FR-2.2** Every factor carries `low`/`base`/`high`; the band propagates through every multiplication and addition to the headline total.
- **FR-2.3** Unit resolution is read from the factor's own unit string; an unrecognised unit raises rather than silently returning a wrong number.
- **FR-2.4** Thermal fuels aggregate into one addressable `thermal_fuel` stream; diesel is held separate because in an Indian SME it is genset electricity, not process heat, and has entirely different abatement options.
- **FR-2.5** Biogenic CO₂ (biomass combustion) is reported as a separate memo line and **excluded** from the Scope 1 total, per GHG Protocol.
- **FR-2.6** Emit both gate-to-gate (Scope 1+2) and cradle-to-gate intensities. Only gate-to-gate is benchmarked.

### FR-3 — Leak-point detection
Three rules, evaluated in priority order, each stream reported once:

- **FR-3.1 Benchmark breach** — stream intensity exceeds sector p75. Severity scales with distance above p75, weighted by the stream's share of total footprint.
- **FR-3.2 Material concentration** — stream is >15% of footprint **and** above sector median.
- **FR-3.3 Structural hotspot** — stream is >25% of footprint with no applicable benchmark (typically a purchased material).
- **FR-3.4** Each leak reports: rule, severity (`critical`/`high`/`moderate`/`watch`), peer percentile, and tonnes recoverable by reaching sector median.
- **FR-3.5** An overall peer position on the gate-to-gate intensity metric.

> **Why Rule 3 exists.** The most common real finding for an Indian engineering SME is that its own plant is efficient and its purchased steel is the problem. A detector that only checked energy intensity would issue a clean bill of health to a plant whose footprint is 70% Scope 3.

### FR-4 — Circular intervention recommender
- **FR-4.1** A library of 30 interventions across five categories: energy, material, process, waste, logistics.
- **FR-4.2** Each intervention declares its target stream, abatement fraction (low/base/high), capex basis, savings model, lifetime, difficulty, disruption days, confidence and evidence.
- **FR-4.3** Sector applicability filtering.
- **FR-4.4** **Blocking** — named (sector, intervention) pairs are evaluated and refused with a stated reason, surfaced in the UI.
- **FR-4.5** **Capping** — named pairs have their substitutable share reduced with a stated reason.
- **FR-4.6** Material substitutions respect a declared physical blend ceiling (`max_substitution_pct`) and the tonnage the plant actually buys.

### FR-5 — Economics
- **FR-5.1** Four savings models, because "you save the whole bill" is only true sometimes:
  - `avoided_purchase` — the plant genuinely stops buying that energy
  - `tariff_delta` — the plant still buys it, at a different unit price
  - `fuel_switch` — equal-energy replacement; **the delta can be negative**
  - `price_delta` — material substitution on tonnes switched
  - `none` — the entire cash case sits in the opex delta
- **FR-5.2** Capex annualised by capital recovery factor `CRF = r(1+r)ⁿ / ((1+r)ⁿ−1)`, never charged in full to year one.
- **FR-5.3** `LCOA = (CRF·capex + Δopex − gross saving) / annual abatement`
- **FR-5.4** Simple payback, NPV over asset life, and a cash-positive flag.
- **FR-5.5** **Interaction de-rating** — in MACC order, each intervention applies to the *residual* stream, not the original baseline. Both standalone and de-rated abatement are shown.

> **Why de-rating matters.** Seven separate interventions target the electricity meter. Their standalone fractions sum to over 100% of the bill, which is physically impossible. Once a VFD has removed 8%, the LED retrofit's 3% applies to what remains. This is the first thing an energy auditor checks on a stacked savings claim.

### FR-6 — Portfolio views
- **FR-6.1** `all` — every applicable intervention.
- **FR-6.2** `cash_positive_only` — LCOA < 0. The headline number.
- **FR-6.3** `quick_wins` — payback ≤ 2 years **and** difficulty ≤ 2. The "start Monday" list.
- **FR-6.4** Each with count, abatement, capex, net annual benefit, blended payback and NPV.

### FR-7 — Visualisation
- **FR-7.1** Sankey: stream → scope → total, ordered by scope then size to minimise ribbon crossing; tail streams bundled.
- **FR-7.2** MACC: width = tonnes, height = ₹/tCO₂e, zero line marked, axis clamped to the informative band with off-scale bars visibly clipped and labelled.
- **FR-7.3** Leak cards with an inline peer-distribution bar showing p50, p75 and the plant's position.
- **FR-7.4** Expandable working for every recommendation — target stream, abatement range, de-rating, capex, savings, LCOA, NPV, savings model.

### FR-8 — Compliance
- **FR-8.1** CBAM indicative exposure = (Scope 1 + Scope 2) × EU export share × reference price. Precursor/upstream emissions **excluded and declared as excluded**.
- **FR-8.2** BRSR readiness checklist with per-item status and the explicit note that assurance is out of scope.
- **FR-8.3** Sector regulatory flags surfaced.

### FR-9 — Transparency
- **FR-9.1** Methodology panel listing standard, GWP set, grid factor source, biogenic treatment.
- **FR-9.2** A "limitations we are not hiding" section, open by default, covering factor provenance, verification status, benchmark caveat, leak rule, de-rating limits and capex grade.

---

## 5. Non-functional requirements

| ID | Requirement | Rationale |
|---|---|---|
| NFR-1 | **Zero external runtime dependencies in the browser** | Venue wifi fails. Both charts are hand-built SVG; no CDN. |
| NFR-2 | **Stateless API** | The plant's data never persists. A better answer to "where is the data stored" than an unused database. |
| NFR-3 | Assessment completes in < 300 ms | It must feel like a calculator, not a batch job. |
| NFR-4 | Every numeric output traceable to a cited factor | Auditability is the product. |
| NFR-5 | Runs offline end-to-end | Demo safety. |
| NFR-6 | Reference data is JSON, not code | A domain expert can extend the library without touching Python. |

---

## 6. Data model

```
PlantProfile
├── name, sector, state
├── annual_output_t, annual_revenue_cr, employees
├── electricity_kwh          → Scope 2
├── fuels{FUEL_KEY: qty}     → Scope 1  (native units per fuel)
├── materials{MAT_KEY: t}    → Scope 3
├── waste{WASTE_KEY: t}      → Scope 3
├── freight{MODE_KEY: t·km}  → Scope 3
└── tariff, discount_rate, eu_export_share_pct

Assessment
├── headline      — the four numbers and the plain-English statement
├── footprint     — scopes, streams, intensities, biogenic memo, uncertainty
├── sankey        — nodes + links
├── leaks         — ranked findings with peer position
├── recommendations — ranked list, MACC curve, three portfolios, blocked list
├── compliance    — CBAM, BRSR
└── methodology   — standard, sources, limitations
```

Reference data: `emission_factors.json` (31 factors across 5 groups, plus 15 state grid variants), `interventions.json` (30), `sectors.json` (10 sectors with benchmarks + demo profiles).

---

## 7. Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| AC-1 | All 10 sectors assess without error | ✅ 10/10 |
| AC-2 | Stream emissions sum to the reported total | ✅ verified |
| AC-3 | No intervention abates more than its target stream holds | ✅ verified |
| AC-4 | De-rated abatement never exceeds standalone | ✅ verified |
| AC-5 | Substitution never exceeds the declared blend cap | ✅ cotton capped at 25% |
| AC-6 | Blocked interventions appear in the UI with a reason | ✅ pharma rPET, ceramics briquette |
| AC-7 | Capped interventions state the restriction | ✅ food rPET 35%, auto steel 45% |
| AC-8 | Fuel switch to a more expensive fuel shows as a net cost | ✅ biomass at +₹1,630/tCO₂e |
| AC-9 | Headline carries an uncertainty band | ✅ ±20.9% on hero demo |
| AC-10 | Page renders with network disabled after first load | ✅ no external assets |

---

## 8. Out of scope for v1, sequenced for v2

1. Multi-site rollup and year-on-year tracking
2. Utility bill OCR / DISCOM portal ingestion to remove manual entry
3. Smart meter and SCADA integration for measured rather than declared baselines
4. Vendor marketplace — connect a recommendation to three quotes
5. Lender pack export for SIDBI / green term loan applications
6. Supplier-portal mode for a corporate to onboard its supplier base
7. Benchmark corpus built from real assessments, replacing literature percentiles
