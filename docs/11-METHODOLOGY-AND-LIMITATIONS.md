# Methodology and Limitations

The document an auditor would ask for. Everything the engine does, and everything it does not.

---

## 1. Standard and boundary

| | |
|---|---|
| **Accounting standard** | GHG Protocol Corporate Accounting and Reporting Standard |
| **GWP set** | IPCC AR6, 100-year |
| **Organisational boundary** | Single facility, operational control |
| **Reporting period** | One year, as declared by the user |
| **Currency** | INR throughout; lakh/crore in presentation |

### 1.1 Scope coverage

| Scope | Included | **Excluded — and declared as excluded** |
|---|---|---|
| **1** | Stationary combustion: coal, furnace oil, LPG, natural gas, biomass, diesel | Mobile combustion (owned fleet), fugitive refrigerants, process emissions (e.g. calcination) |
| **2** | Purchased electricity, location-based, state grid factor | Market-based method; purchased steam/heat |
| **3** | Cat. 1 purchased goods (modelled materials), Cat. 4/9 transport, Cat. 5 waste | Business travel, commuting, capital goods, use phase, end-of-life, leased assets, franchises, investments |

**Exclusions are declared, never reported as zero.** A Scope 3 figure that silently omits eight categories while looking complete is worse than one that names what it covers.

---

## 2. Calculation chain

### 2.1 Activity → emissions

```
emissions_tCO2e = quantity × factor × numerator_multiplier
```

The numerator multiplier is **read from the factor's own unit string** — `kgCO2e/...` → 0.001, `tCO2e/...` → 1.0. An unrecognised unit raises an exception rather than silently returning a wrong number. Electricity is the one special case: factors are per MWh, the UI collects kWh, and the conversion happens in the engine so the user never does arithmetic.

### 2.2 Uncertainty

Every factor carries `low` / `base` / `high`. The band is carried through **every** operation:

- Addition: bands add
- Positive scaling: band scales
- **Negative scaling: the band's ends swap** — a common bug, handled explicitly

Reported headline uncertainty is `(high − low) / (2 × base)`, expressed as ±%. The hero demo reports **±20.9%**.

> **Why this matters.** A tool that prints "412 tCO₂e" is making a claim it cannot support. One that prints "412 tCO₂e (360–470)" is making a claim an auditor can check. Collapsing the band at the first multiplication — which is what most tools do — destroys the only honest thing you can say about a screening estimate.

### 2.3 Biogenic carbon

Per GHG Protocol, biogenic CO₂ from biomass combustion is **reported separately and excluded from the Scope 1 total**. The factor for agri-residue briquette (0.06 tCO₂e/t) covers **only CH₄ and N₂O**. The engine additionally computes the biogenic CO₂ memo line (≈1.55 tCO₂/t) so the disclosure is complete.

Setting biomass to zero with no explanation is numerically close and methodologically indefensible.

### 2.4 Intensity bases

Two are computed; **only one is benchmarked.**

| Basis | Computed | Benchmarked | Why |
|---|---|---|---|
| Gate-to-gate (Scope 1+2) per tonne | ✅ | ✅ | What published sector energy benchmarks measure; the part the plant controls |
| Cradle-to-gate (all scopes) per tonne | ✅ | ❌ | A plant buying more material per tonne of product is not running a worse factory |

**This was a correction made during the build.** Our initial benchmark set mixed the two bases and reported an ordinary plant as catastrophic (8.02 against a "p75" of 3.4). Mixing cradle-to-gate and gate-to-gate is the most common methodological error in SME carbon tools.

---

## 3. Leak detection

A "leak point" is defined as a stream where carbon escapes **unnecessarily** — and unnecessarily is only meaningful relative to peers.

| Rule | Trigger | Severity |
|---|---|---|
| `benchmark_breach` | intensity > sector p75 | `min(1, over/0.5)` weighted by stream share, +0.15 floor |
| `material_concentration` | share > 15% **and** intensity > p50 | distance above p50, scaled by share |
| `structural_hotspot` | share > 25%, no applicable benchmark | scaled by share above 25% |

Severity bands: `critical` ≥ 0.60 · `high` ≥ 0.35 · `moderate` ≥ 0.15 · `watch` below.

Each stream reports **once**, on whichever basis the sector benchmarks first — a stream benchmarked both per-tonne and per-crore must not raise two findings.

`gap_to_median` = `stream_tCO2e × (actual − p50) / actual` — the tonnes recoverable by reaching sector median.

---

## 4. Intervention economics

### 4.1 Levelised cost of abatement

```
CRF  = r(1+r)ⁿ / ((1+r)ⁿ − 1)
LCOA = (CRF × capex + Δopex − gross_saving) / annual_abatement
```

Capex is **annualised**, never charged in full to year one. Charging raw capex makes a 25-year solar asset look worse than a 5-year lighting retrofit, which is simply wrong.

Negative LCOA ⇒ the intervention pays for itself.

### 4.2 Savings models

| Model | Formula | Used for |
|---|---|---|
| `avoided_purchase` | stream cost × fraction | Efficiency, captive solar — you stop buying the energy |
| `tariff_delta` | quantity × price differential | Open access — you still buy it, at a different price |
| `fuel_switch` | GJ × (current ₹/GJ − replacement ₹/GJ) | Biomass switch — **can be negative** |
| `price_delta` | tonnes switched × (old − new price) | Material substitution |
| `none` | 0 | Cash case carried entirely in `Δopex` |

> Modelling open access as `avoided_purchase` overstates its business case by roughly **20×**. This taxonomy exists because we made that error and caught it.

### 4.3 Substitution ceilings

Tonnes switched is capped by, in order: the declared `max_substitution_pct`, any `SECTOR_CAPS` override, and the tonnage the plant actually buys.

| Material | Cap | Reason |
|---|---|---|
| Recycled cotton | 25% | Staple length falls with each mechanical recycling pass |
| rPET | 50% (35% in food) | Food-contact grade approval |
| Recycled aluminium | 70% | Alloy trace-element limits |
| Secondary steel | 80% (45% in auto) | Fatigue-rated component certification |
| Blended cement | 70% | Structural specification |
| Recycled board | 90% | Near-frictionless for transit packaging |

### 4.4 Interaction de-rating

After sorting by LCOA, each intervention applies to the **residual** of its target stream:

```
remaining[stream] = 1.0
for rec in sorted_by_lcoa:
    frac = rec.abatement / rec.stream_total
    rec.portfolio_abatement = rec.stream_total × remaining[stream] × frac
    remaining[stream] *= (1 − frac)
```

Both standalone and de-rated figures are reported on every card.

**Known limitation, declared in the API response:** cross-stream overlap is not de-rated. In-house regrind (targeting all materials) and a specific material substitution can double-count at the margin. Within-stream interaction — which is where the large errors live — is handled.

---

## 5. Compliance calculations

### 5.1 CBAM

```
exposure_tCO2e = (Scope 1 + Scope 2) × EU_export_share
indicative_cost = exposure × reference_price
```

**Precursor and upstream material emissions are excluded.** CBAM precursor rules require supplier-specific data this tool does not hold; estimating it would be a guess presented as a number.

The reference price is a named constant, not a live feed. The panel requires the user to confirm current CN codes and certificate price before acting.

### 5.2 BRSR

A readiness checklist, not a filing. States explicitly that **assurance is out of scope** — the tool produces working papers; a licensed assurer signs them.

---

## 6. Complete limitations register

| # | Limitation | Severity | Mitigation / route out |
|---|---|---|---|
| L1 | Emission factors are literature values, not primary measurements | **High** | Bands + sources shown; flagged for re-verification before commercial use |
| L2 | Sector benchmarks are indicative percentiles, not a surveyed corpus | **High** | Stated in UI; replaced by measured corpus as usage grows |
| L3 | Capex figures are screening-grade planning estimates | Medium | Stated on every card; intended to trigger a quotation, not replace one |
| L4 | Abatement fractions are literature ranges, strongly site-sensitive | Medium | Low/base/high carried; confidence rating per intervention |
| L5 | Inputs are declared, not measured or validated | **High** | v2: bill ingestion and plausibility cross-checks |
| L6 | Cross-stream interaction not de-rated | Low | Declared in API response |
| L7 | Eight Scope 3 categories out of scope | Medium | Declared, never reported as zero |
| L8 | Scope 2 is location-based only | Low | Market-based method needs contractual instruments we don't collect |
| L9 | No process emissions (e.g. cement calcination) | Medium | Material for some sectors; declared |
| L10 | CBAM reference price is a constant | Medium | User confirmation required |
| L11 | Single-year snapshot; no trend or seasonality | Low | v1.1 |
| L12 | Behavioural savings assumed persistent | Medium | Caveated on the specific interventions where regression is known |
| L13 | No validation that a recommendation was implementable at this specific site | Medium | Difficulty, disruption days and caveats shown; a site visit remains necessary |

---

## 7. What this tool is not

- **Not a BEE-accredited energy audit.** It is a screening pass that tells you where to spend one.
- **Not an assurance engine.** No claim of verification.
- **Not a carbon credit issuer, verifier or registry.**
- **Not a substitute for a vendor quotation.** Capex is planning-grade.
- **Not a compliance filing.** The BRSR panel is readiness, not submission.

## 8. Reproducibility

The engine is fully deterministic. Same inputs → same outputs, always. No randomness, no model inference, no external calls, no time dependence. Every figure traces to a named factor in versioned JSON.

Invariants verified across all ten sectors:

- Stream emissions sum to the reported total
- No intervention abates more than its target stream contains
- De-rated abatement never exceeds standalone abatement
- Substitution never exceeds the declared blend ceiling

**Result: 0 violations across 10 sectors.**
