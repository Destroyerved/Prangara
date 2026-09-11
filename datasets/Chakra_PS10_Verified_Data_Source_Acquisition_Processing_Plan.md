# Chakra PS10 — Verified Data Source Acquisition, Processing & Conversion Plan

## Purpose

This document defines the **source-verification, download, extraction, normalization, and replacement workflow** for the Chakra PS10 dataset described in `ChakraReport(1).pdf`.

The objective is to rebuild Chakra's reference data so that every number is one of the following:

```text
🟢 PRIMARY / OFFICIAL REFERENCE
Published by an authoritative government, standards body, regulator,
scientific body, or industry LCI source.

🔵 PLANT-REPORTED
Provided directly by the factory from bills, meters, invoices,
production records, waste records, ERP, or operator input.

🟡 DERIVED / CALCULATED
Calculated by Chakra using explicit, versioned inputs and formulae.

🟠 SCREENING / LITERATURE-DERIVED
Useful for hackathon screening, but not an official measured benchmark.
Must be labelled as such.
```

The final goal is **not** to claim that every output is government data.

The goal is:

> **Official/primary evidence where available + real factory data where plant-specific + transparent calculations where derivation is unavoidable.**

---

# 1. What the Existing Chakra Report Contains

The report describes three reference files:

```text
prototype/data/
├── emission_factors.json
├── interventions.json
└── sectors.json
```

Current report-level description:

```text
emission_factors.json
→ 31 factors across five groups
→ plus 15 state grid variants
→ each carries value, low, high, unit, scope and source

interventions.json
→ 30 circular interventions
→ energy, material, process, waste and logistics

sectors.json
→ 10 Indian industrial sectors
→ benchmarks + realistic demo profiles
```

The report also states that:

- emission factors are literature/reference values, not primary plant measurements;
- sector benchmarks are indicative screening percentiles, not BEE-accredited benchmark sets;
- capex values are planning-grade estimates;
- v1 plant inputs are declared rather than measured;
- every numeric output should remain traceable to a named reference.

Therefore this plan **preserves the existing Chakra architecture**, but upgrades the provenance and extraction quality.

---

# 2. Final Folder Structure

Do not overwrite the original Chakra data immediately.

Use:

```text
data/
│
├── legacy/
│   ├── emission_factors.json
│   ├── interventions.json
│   └── sectors.json
│
├── raw/
│   ├── cea/
│   ├── desnz/
│   ├── ipcc/
│   ├── ghg_protocol/
│   ├── worldsteel/
│   ├── iai/
│   ├── bee/
│   ├── textile_exchange/
│   ├── plasticseurope/
│   ├── gcca/
│   ├── cepi/
│   ├── feve/
│   ├── glec_india/
│   ├── bis/
│   ├── iec/
│   ├── sebi/
│   ├── cbam/
│   ├── cpcb/
│   └── moefcc/
│
├── extracted/
│   ├── source_tables/
│   └── source_text/
│
├── clean/
│   ├── emission_factors_verified.json
│   ├── interventions_verified.json
│   ├── sectors_verified.json
│   ├── regulations_verified.json
│   └── material_lci_verified.json
│
├── derived/
│   ├── coal_conversions.json
│   ├── waste_factors.json
│   ├── benchmark_screening.json
│   └── state_grid_experimental.json
│
├── metadata/
│   ├── source_registry.json
│   ├── source_checksums.json
│   ├── verification_log.json
│   ├── replacement_map.json
│   └── unresolved_items.json
│
└── reports/
    ├── source_verification_report.md
    └── source_verification_report.csv
```

---

# 3. Source Authority Hierarchy

Always prefer sources in this order.

```text
TIER A — INDIA OFFICIAL / REGULATORY
CEA
BEE / PAT / SIDHIEE / ADEETIE
CPCB
MoEFCC
BIS
SEBI
Factory bills / invoices / measured records
              ↓

TIER B — INTERNATIONAL OFFICIAL / SCIENTIFIC
IPCC
GHG Protocol
European Commission
UK DESNZ
IEC
              ↓

TIER C — INDUSTRY LCI / PEER-REVIEWED / EPD
worldsteel
International Aluminium Institute
Textile Exchange
PlasticsEurope
GCCA / verified cement EPDs
CEPI / paper EPDs
FEVE
Smart Freight Centre / GLEC
              ↓

TIER D — CHAKRA-DERIVED
unit conversions
Indian coal tonne-factor conversion
Scope calculations
leak scores
benchmark comparisons
MACC
NPV
payback
CBAM indicative exposure
```

Do not use the following as a primary production source when a better source exists:

```text
Kaggle
random GitHub repositories
generic blogs
AI-generated values
uncited spreadsheets
SEO websites
random vendor marketing pages
```

---

# 4. Canonical Source Registry Schema

Create:

```text
data/metadata/source_registry.json
```

Each source must use this structure:

```json
{
  "source_id": "SRC-CEA-V21",
  "agency": "Central Electricity Authority",
  "dataset": "CO2 Baseline Database",
  "version": "21.0",
  "jurisdiction": "India",
  "authority_class": "GOVERNMENT_OFFICIAL",
  "source_url": "https://cea.nic.in/cdm-co2-baseline-database/?lang=en",
  "retrieved_at": "ISO-8601 timestamp",
  "reporting_period": "FY2024-25",
  "raw_file": "data/raw/cea/...",
  "sha256": "...",
  "access_method": "download",
  "license_or_terms_checked": true,
  "notes": ""
}
```

Every clean factor must reference:

```text
source_id
source_record
source_version
source_boundary
source_geography
retrieved_at
```

---

# 5. Verification Status Values

Every legacy Chakra record must receive one status:

```text
VERIFIED_PRIMARY
VERIFIED_OFFICIAL
VERIFIED_INDUSTRY_LCI
VERIFIED_METHODOLOGY
DERIVED_TRANSPARENT
SCREENING_ONLY
PLANT_SPECIFIC_REQUIRED
REPLACE_REQUIRED
UNRESOLVED
```

---

# 6. Source 1 — CEA Grid Emission Factor

## Existing Chakra usage

The report uses approximately:

```text
India national grid:
0.716 tCO2e/MWh

State variants:
~0.48 to ~0.88
```

The report itself says the national factor should be re-checked for latest vintage.

## Verified source

```text
Agency:
Central Electricity Authority

Dataset:
CO2 Baseline Database

Current version:
Version 21.0

Official page:
https://cea.nic.in/cdm-co2-baseline-database/?lang=en
```

## Acquisition

Preferred:

```text
official downloadable database
+
official Version 21.0 user guide
```

Save both files.

Example:

```text
raw/cea/
├── cea_baseline_v21.*
└── cea_user_guide_v21.pdf
```

## Processing

Extract:

```text
weighted_average_grid_factor
operating_margin
build_margin
combined_margin
database_version
reporting_period
unit
```

Normalize unit to:

```text
tCO2e_per_MWh
```

## Important replacement rule

Do not label Chakra's existing state-specific values as official CEA state grid factors.

For v1:

```text
Use official India grid factor
```

If state values are retained:

```text
source_type = DERIVED
official = false
methodology = "state generation-mix model"
```

Preferred final status:

```text
national_grid → VERIFIED_OFFICIAL
state_grid_variants → REPLACE_REQUIRED or DERIVED_TRANSPARENT
```

---

# 7. Source 2 — UK DESNZ 2026 Fuel Conversion Factors

## Existing Chakra usage

The report includes factors for:

```text
diesel
natural gas
LPG
```

attributed to DEFRA.

## Verified source

The current official publisher is:

```text
Department for Energy Security and Net Zero (DESNZ)
```

Official 2026 page:

```text
https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026
```

The page provides:

```text
Full XLSX
Flat-file XLSX for automatic processing
Methodology
```

## Acquisition

Prefer the machine-readable flat file.

Save:

```text
raw/desnz/
├── desnz_ghg_conversion_factors_2026_flat.xlsx
├── desnz_ghg_conversion_factors_2026_full.xlsx
└── desnz_2026_methodology.*
```

## Extraction

Filter only required stationary/industrial fuels.

Potential Chakra fuel keys:

```text
diesel
natural_gas
lpg
```

Do not rely only on fuel name.

Preserve:

```text
activity
fuel
scope/category
unit
kgCO2e
CO2
CH4
N2O
year
```

## Clean record

```json
{
  "key": "diesel_stationary",
  "group": "fuels",
  "value": 0,
  "low": null,
  "high": null,
  "unit": "kgCO2e/litre",
  "scope": 1,
  "source_id": "SRC-DESNZ-2026",
  "source_record": "exact flat-file row identifier",
  "geography": "UK factor used as combustion reference",
  "verification_status": "VERIFIED_OFFICIAL"
}
```

If Chakra wants low/base/high bands, do not invent them from the point value.

Bands must come from:

```text
documented uncertainty
or
separately declared Chakra screening uncertainty
```

Label the latter as derived.

---

# 8. Source 3 — IPCC Combustion Factors and Waste Methodology

## Verified source

```text
IPCC Emission Factor Database
https://www.ipcc-nggip.iges.or.jp/EFDB/

IPCC 2019 Refinement
https://www.ipcc-nggip.iges.or.jp/public/2019rf/
```

Use IPCC particularly for:

```text
furnace/residual oil
coal combustion
CH4
N2O
waste disposal
landfill methane
waste treatment methodology
```

## Raw storage

```text
raw/ipcc/
├── combustion_factors.*
├── waste_volume5.*
└── factor_metadata.*
```

## Critical processing rule

IPCC may report factors as:

```text
kg gas / TJ
```

while Chakra wants:

```text
tCO2e / tonne fuel
```

The conversion is derived.

Store both.

Example:

```json
{
  "source_factor_value": 94600,
  "source_factor_unit": "kgCO2/TJ",
  "ncv_value": 15.9,
  "ncv_unit": "GJ/t",
  "ncv_source_id": "SRC-...",
  "converted_factor_value": 1.504,
  "converted_factor_unit": "tCO2/t",
  "conversion_formula": "(kgCO2/TJ × GJ/t) / 1000",
  "verification_status": "DERIVED_TRANSPARENT"
}
```

Never write:

```text
source = "IPCC"
```

for the final per-tonne value if Chakra itself converted it.

Instead:

```text
reference_source = IPCC
conversion = Chakra
```

---

# 9. Source 4 — GHG Protocol

## Purpose

This is a methodology source, not a table of every emission factor.

Official:

```text
https://ghgprotocol.org/corporate-standard
```

Use for:

```text
Scope 1 / 2 / 3 accounting structure
biogenic CO2 treatment
corporate inventory methodology
location-based Scope 2 reporting
```

Store source as:

```text
VERIFIED_METHODOLOGY
```

Do not extract arbitrary numerical factors from it unless directly published.

---

# 10. Source 5 — worldsteel LCI

## Existing Chakra use

The report uses generic primary/secondary steel factors.

## Verified source

```text
World Steel Association
2026 LCI release
based on 2024 data

https://worldsteel.org/wider-sustainability/life-cycle-thinking/life-cycle-inventory-data-and-eco-profiles/

Release information:
https://worldsteel.org/media/press-releases/2026/worldsteel-releases-2026-lci-database/
```

The dataset covers multiple products.

## Important rule

Do not keep a universal:

```text
steel = X tCO2e/t
```

unless the chosen product and system boundary are explicit.

Select the most appropriate Chakra proxy, such as:

```text
hot rolled coil
rebar
plate
sections
etc.
```

## Acquisition

worldsteel data may require:

```text
LCI request form
or
eco-profile download
```

Do not bypass access terms.

Save the downloaded source manually if required.

## Clean schema

```json
{
  "material_key": "steel_hot_rolled_coil",
  "material_family": "steel",
  "product": "Hot Rolled Coil",
  "value": 0,
  "unit": "tCO2e/t",
  "boundary": "cradle-to-gate",
  "geography": "global_or_selected_region",
  "data_year": 2024,
  "release_year": 2026,
  "source_id": "SRC-WORLDSTEEL-2026",
  "verification_status": "VERIFIED_INDUSTRY_LCI"
}
```

---

# 11. Source 6 — International Aluminium Institute

## Existing Chakra use

The report approximately uses:

```text
primary aluminium = 13.0 tCO2e/t
secondary aluminium = 0.60 tCO2e/t
```

## Strong current source

```text
International Aluminium Institute
https://international-aluminium.org/
```

Useful source pages:

```text
https://international-aluminium.org/landing/as-well-as-aluminium-recycling-saving-95-of-the-energy-needed-for-primary-aluminium-production-the-recycling-process-saves-a-similar-percentage-in-greenhouse-gas-emissions/

https://international-aluminium.org/resources/2019-life-cycle-inventory-lci-data-and-environmental-metrics/
```

IAI currently reports separate boundaries for primary and recycled aluminium.

## Critical boundary rule

Do not compare:

```text
primary cradle-to-gate
```

with:

```text
recycled gate-to-gate
```

without showing the boundary difference.

Final record must include:

```text
boundary
geography
data_year
source_id
```

Status:

```text
VERIFIED_INDUSTRY_LCI
```

---

# 12. Source 7 — Cotton / Recycled Cotton

## Existing Chakra weakness

The PDF gives a cotton-yarn factor but does not provide a sufficiently specific primary citation for the exact number.

## Strong source

```text
Textile Exchange
Cotton Life Cycle Assessment
Published March 2026

https://textileexchange.org/knowledge-center/reports/cotton-life-cycle-assessment/

Technical report:
https://textileexchange.org/knowledge-center/documents/cotton-lca-technical-report/
```

The study includes:

```text
India
conventional cotton country averages
organic
regenerative
recycled
```

## Important boundary issue

The cotton LCA is primarily:

```text
cradle-to-gin-gate
```

Chakra's material is often:

```text
cotton yarn
```

Therefore do not directly rename cotton lint factor as yarn factor.

Use:

```text
cotton raw-material impact
+
spinning energy/process impact
=
cotton yarn screening factor
```

The second step is Chakra-derived unless a yarn-specific EPD/LCA is found.

Final status:

```text
raw cotton → VERIFIED_INDUSTRY_LCI
cotton yarn → DERIVED_TRANSPARENT unless direct yarn LCI found
```

---

# 13. Source 8 — PET / rPET

## Existing Chakra weakness

The PDF contains generic PET and recycled PET factors without exact factor-level primary references.

## Strong source path

```text
PlasticsEurope Eco-profiles
https://plasticseurope.org/sustainability/circularity/life-cycle-thinking/eco-profiles-set/
```

These provide:

```text
LCI datasets
Environmental Product Declarations
process dates
methodology
```

## Processing

Locate relevant chain:

```text
PET resin
virgin PET
rPET if available
```

Record:

```text
product
region
boundary
production route
data year
factor
unit
source
```

If European data is used for an Indian factory:

```text
geography = Europe
proxy_for_india = true
confidence = MEDIUM
```

Never label as an Indian average.

---

# 14. Source 9 — Cement / Blended Cement

## Existing Chakra weakness

The report uses generic:

```text
OPC → blended cement
```

factor values.

## Source path

Use:

```text
GCCA Environmental Product Declaration methodology/tool
https://gccassociation.org/sustainability-innovation/environmental-product-declarations/

GCCA EPD guidance:
https://gccassociation.org/wp-content/uploads/2023/07/GCCA_EPD_Tool_eBook_2023.pdf
```

For India, prefer:

```text
verified producer EPD
```

for a product equivalent to:

```text
OPC
PPC
PSC
```

## Technical standards

Use BIS for admissibility/specification:

```text
IS 455:2015 — Portland Slag Cement
IS 1489 (Part 1):2015 — Portland Pozzolana Cement, Fly Ash Based

https://www.bis.gov.in/is-1489-part-1-2015/?lang=en
```

BIS standards prove technical specification.

They **do not themselves provide the carbon footprint**.

Carbon factor must come from:

```text
EPD/LCA source
```

---

# 15. Source 10 — Paper / Board

## Strong methodology source

```text
CEPI
Framework for Carbon Footprints for Paper and Board Products

https://www.cepi.org/framework-for-carbon-footprints-for-paper-and-board-products/
```

Use CEPI as methodology/context.

For numeric factors prefer:

```text
specific EPD
product-specific LCI
```

Examples:

```text
kraft paper
recycled board
corrugated board
coated paper
```

Do not keep a universal "paper" factor if the product type is known.

---

# 16. Source 11 — Glass

## Strong source

```text
FEVE Life Cycle Assessment
https://feve.org/glass-industry-positions/life-cycle-assessment/
```

FEVE provides LCIs for:

```text
0% recycled content
EU-average recycled content
100% recycled content
```

This is well suited to Chakra's circular substitution logic.

Record:

```text
recycled_content_pct
boundary
functional_unit
region
data_year
peer_review_status
```

Status:

```text
VERIFIED_INDUSTRY_LCI
```

---

# 17. Source 12 — Road and Rail Freight

## Existing Chakra weakness

The report currently uses generic road and rail factors.

## Strong India-specific source

```text
Smart Freight Centre
India Default GHG Emission Values V1.0
Published June 2026

https://smartfreightcentre.org/news/13311661
```

It is designed to complement:

```text
GLEC Framework v3.1
```

and includes India-specific road and rail values.

## Processing

Do not collapse every truck into one factor unless required.

Preserve dimensions such as:

```text
mode
vehicle_class
fuel
load_factor
distance_type
TTW/WTW boundary
unit
```

Canonical Chakra unit:

```text
kgCO2e / tonne-km
```

If source unit differs, preserve raw and normalized values.

---

# 18. Source 13 — Waste / Landfill / Methane

## Existing Chakra weakness

The report uses a single organic-waste-to-landfill factor and a negative anaerobic-digestion factor.

These are highly assumption-sensitive.

## Correct source path

Use:

```text
IPCC 2019 Refinement
Volume 5 — Waste
```

Build a small calculation model instead of one universal number.

Model inputs:

```text
waste_type
DOC
DOCf
MCF
methane_fraction
methane_recovery
oxidation_factor
GWP_version
```

Output:

```text
kgCH4
kgCO2e
```

Record all assumptions.

## Anaerobic digestion

Do not use one global negative factor as "official."

Calculate:

```text
avoided landfill methane
+
captured biogas benefit
-
process emissions
-
methane leakage
-
transport
-
digestate-related emissions
-
energy displacement assumptions
```

Final status:

```text
DERIVED_TRANSPARENT
```

---

# 19. Source 14 — BEE Energy & Resource Mapping

## Purpose

Replace weak literature-only sector benchmark logic wherever possible with real Indian cluster evidence.

Official BEE source:

```text
https://beeindia.gov.in/show_content.php?lang=1&level=2&lid=383&ls_id=235
```

BEE reports:

```text
55 MSME clusters
550+ detailed energy audits
```

covering sectors such as:

```text
Foundry
Forging
Paper
Steel Re-rolling
Pharma
Bricks
Glass & Refractory
Chemical
Food Processing
Textile
Leather
```

## Processing

Extract whenever available:

```text
sector
cluster
process
specific electricity consumption
specific thermal energy consumption
total SEC
reported range
technology
sample context
year
source document
```

## Benchmark redesign

Prefer:

```text
Plant SEC
vs.
BEE reported range
```

instead of pretending to have an authoritative p75.

Example:

```text
plant = 9.4 GJ/t
BEE range = 6.0–8.9 GJ/t
result = ABOVE_REPORTED_RANGE
```

If Chakra keeps p25/p50/p75:

```text
verification_status = SCREENING_ONLY
```

---

# 20. Source 15 — BEE SME Programme / SIDHIEE

Official sources:

```text
BEE SME:
https://www.beeindia.gov.in/show_content.php?lang=1&level=1&lid=317&ls_id=194

SIDHIEE:
https://sidhiee.beeindia.gov.in/
```

Available material includes:

```text
Situation Analysis Reports
Cluster Specific Manuals
Detailed Project Reports
Post Implementation Audit Reports
Case Studies
Technology demonstrations
```

Use these for intervention evidence.

Extract:

```text
intervention
sector
cluster
baseline energy
post-implementation energy
energy saving %
investment cost
annual monetary saving
payback
implementation context
source document
year
```

---

# 21. Source 16 — ADEETIE

Current source:

```text
https://adeetie.beeindia.gov.in/energy-efficient-technologies
```

The BEE ADEETIE technology list includes fields such as:

```text
proposed energy saving %
monetary saving
average investment cost
payback period
```

This is highly useful for Chakra's intervention library.

## Use

For relevant interventions:

```text
VFD
energy efficient motor
pumps
compressors
boilers
heat recovery
etc.
```

Extract official BEE planning values.

Status:

```text
VERIFIED_OFFICIAL_SCREENING
```

Still tell users:

```text
actual plant capex requires vendor quotation
```

---

# 22. Source 17 — IEC Motor Efficiency

Current standard:

```text
IEC 60034-30-1:2025

https://webstore.iec.ch/en/publication/91195
```

Use this for:

```text
IE efficiency class constraints
motor eligibility/reference
```

Do not derive plant savings directly from the standard.

Savings require:

```text
existing motor efficiency
replacement efficiency
load profile
run hours
```

---

# 23. Source 18 — SEBI BRSR / BRSR Core

Official source:

```text
SEBI
https://www.sebi.gov.in/
```

Important current circular:

```text
28 March 2025
SEBI/HO/CFD/CFD-PoD-1/P/CIR/2025/42

https://www.sebi.gov.in/legal/circulars/mar-2025/measures-to-facilitate-ease-of-doing-business-with-respect-to-framework-for-assurance-or-assessment-esg-disclosures-for-value-chain-and-introduction-of-voluntary-disclosure-on-green-credits_93102.html
```

## Chakra rule

Do not state:

```text
all SME suppliers are legally required to report BRSR Core
```

Use current wording aligned to official requirements.

Store:

```text
regulation
circular_number
publication_date
requirement_type
mandatory_or_voluntary
applicability
source_id
```

---

# 24. Source 19 — EU CBAM

Official source:

```text
European Commission
https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en
```

Use for:

```text
covered sectors/products
definitive-regime status
reporting rules
current implementation guidance
```

## Critical rule

Chakra's:

```text
(Scope 1 + Scope 2)
× EU export share
× reference price
```

is not official CBAM liability.

Keep name:

```text
indicative_cbam_exposure
```

Status:

```text
DERIVED_TRANSPARENT
```

Store:

```text
formula
excluded_precursors
reference_price
reference_price_date
user_confirmation_required
```

---

# 25. Source 20 — CPCB / MoEFCC Environmental Rules

Use primary official pages/documents for:

```text
Hazardous Waste Rules
Solid Waste Management Rules
Plastic Waste Management / EPR
Fly Ash / Ash Utilisation notifications
```

Suggested official roots:

```text
https://cpcb.nic.in/
https://moef.gov.in/
```

Download exact regulation/notification used.

Do not merely store:

```text
"Source: CPCB"
```

Store:

```text
rule_name
notification_number
amendment
publication_date
applicable_sector
exact_clause_if_used
source_url
```

---

# 26. `emission_factors_verified.json` Canonical Schema

Every factor should look like:

```json
{
  "key": "example_factor",
  "group": "fuels",
  "display_name": "Example",
  "value": 1.0,
  "low": 0.9,
  "high": 1.1,
  "unit": "kgCO2e/unit",
  "gas_basis": "CO2e",
  "scope": 1,

  "geography": "India",
  "boundary": "combustion_only",
  "data_year": 2026,

  "source_id": "SRC-...",
  "source_record": "table/row/page/EPD field",
  "source_value": 1.0,
  "source_unit": "kgCO2e/unit",

  "conversion_applied": false,
  "conversion_formula": null,
  "conversion_inputs": [],

  "proxy_for_india": false,
  "confidence": "HIGH",

  "verification_status": "VERIFIED_OFFICIAL",
  "verified_at": "ISO timestamp"
}
```

---

# 27. `interventions_verified.json` Canonical Schema

```json
{
  "id": "INT-VFD",
  "name": "Variable Frequency Drive",
  "category": "energy",
  "target_stream": "electricity",

  "applicable_sectors": ["..."],

  "abatement": {
    "low": 0.0,
    "base": 0.0,
    "high": 0.0,
    "unit": "fraction_of_target_stream",
    "source_id": "SRC-BEE-...",
    "source_record": "DPR/report/page",
    "verification_status": "VERIFIED_OFFICIAL_SCREENING"
  },

  "economics": {
    "capex_basis": "...",
    "capex_value": null,
    "capex_source_id": "SRC-BEE-...",
    "planning_grade": true,

    "savings_model": "avoided_purchase",
    "lifetime_years": 0
  },

  "constraints": {
    "max_substitution_pct": null,
    "blocked_sectors": [],
    "sector_caps": {}
  },

  "difficulty": 0,
  "disruption_days": 0,

  "confidence": "HIGH",
  "evidence_notes": [],
  "source_ids": ["..."],

  "actual_quote_required": true
}
```

---

# 28. `sectors_verified.json` Canonical Schema

```json
{
  "sector_key": "ceramics",
  "sector_name": "Ceramic Tiles",

  "clusters": [
    {
      "name": "Morbi",
      "state": "Gujarat",
      "source_id": "SRC-BEE-..."
    }
  ],

  "benchmarks": {
    "electricity_kwh_per_t": {
      "type": "reported_range",
      "low": null,
      "high": null,
      "source_id": "SRC-BEE-...",
      "status": "VERIFIED_OFFICIAL_SCREENING"
    },

    "thermal_gj_per_t": {
      "type": "reported_range",
      "low": null,
      "high": null,
      "source_id": "SRC-BEE-...",
      "status": "VERIFIED_OFFICIAL_SCREENING"
    }
  },

  "legacy_percentiles": {
    "enabled": false,
    "reason": "literature-derived, not authoritative surveyed corpus"
  },

  "regulatory_flags": [],
  "demo_profile": {
    "synthetic": true,
    "must_not_be_labelled_real_factory": true
  }
}
```

---

# 29. Plant Input Schema

These values should not come from internet averages if actual factory data exists.

```json
{
  "plant_id": "PLANT-001",

  "electricity": {
    "kwh_per_year": 0,
    "source_type": "PLANT_REPORTED",
    "evidence": "electricity_bill"
  },

  "fuels": {
    "diesel_litre_per_year": 0,
    "coal_t_per_year": 0,
    "evidence": "purchase_invoice"
  },

  "materials": {
    "steel_t_per_year": 0,
    "evidence": "purchase_ledger"
  },

  "waste": {
    "waste_t_per_year": 0,
    "evidence": "waste_manifest"
  },

  "annual_output_t": 0,
  "evidence": "production_record"
}
```

Preferred source hierarchy:

```text
meter
invoice
bill
ERP export
production ledger
operator declaration
```

---

# 30. Economic Data Rules

## Electricity tariff

Preferred:

```text
actual electricity bill
```

Fallback:

```text
official SERC / DISCOM tariff
```

Do not use a universal:

```text
₹8/kWh
```

as "real data."

If used:

```text
status = DEMO_DEFAULT
```

## Fuel prices

Preferred:

```text
actual purchase invoice
```

Fallback:

```text
documented market reference
```

## Material prices

Preferred:

```text
actual purchase ledger
```

## Capex

Preferred:

```text
current vendor quotation
```

Fallback:

```text
BEE DPR / ADEETIE planning value
```

## Cost of capital

Preferred:

```text
actual lender/plant value
```

Fallback:

```text
editable default
```

---

# 31. Conversion Pipeline

For every source:

```text
SOURCE
  ↓
DOWNLOAD / EXPORT
  ↓
RAW FILE
  ↓
HASH + SOURCE REGISTRY
  ↓
PARSE
  ↓
EXTRACT RELEVANT TABLE/ROWS
  ↓
KEEP ORIGINAL VALUES
  ↓
NORMALIZE COLUMNS
  ↓
NORMALIZE UNITS
  ↓
CHECK BOUNDARIES
  ↓
CHECK GEOGRAPHY
  ↓
CHECK YEAR/VINTAGE
  ↓
MAP TO CHAKRA KEYS
  ↓
VALIDATE
  ↓
WRITE CLEAN JSON
  ↓
COMPARE AGAINST LEGACY
  ↓
APPROVE REPLACEMENT
```

---

# 32. Raw-to-Clean Field Preservation

Never lose the original source number.

Example:

```json
{
  "source_value": 94600,
  "source_unit": "kgCO2/TJ",

  "clean_value": 1.504,
  "clean_unit": "tCO2/t",

  "conversion_applied": true,

  "conversion_formula":
    "(source_value * ncv_GJ_per_t / 1000 GJ_per_TJ) / 1000 kg_per_t"
}
```

---

# 33. Unit Normalization

Recommended Chakra canonical units:

```text
electricity:
tCO2e/MWh

liquid fuels:
kgCO2e/litre

gaseous fuels:
kgCO2e/Sm3
or energy-based factor retained separately

solid fuels:
tCO2e/t
+
raw IPCC kg/TJ retained

materials:
tCO2e/t

freight:
kgCO2e/t-km

waste:
kgCO2e/t
or tCO2e/t

money:
INR

energy:
kWh
MWh
GJ

production:
tonnes/year
```

---

# 34. Boundary Validation

For LCA factors, always check:

```text
cradle-to-gate
gate-to-gate
cradle-to-grave
combustion-only
well-to-tank
tank-to-wheel
well-to-wheel
```

Do not compare two material factors with different boundaries without recording the mismatch.

Example problem:

```text
primary aluminium = cradle-to-gate
recycled aluminium = gate-to-gate
```

This is not automatically an invalid source.

It is a **boundary difference that must be explicit**.

---

# 35. Geography Validation

Every factor must declare geography:

```text
India
Global
Europe
UK
Region-specific
Plant-specific
```

If a non-Indian factor is used:

```text
proxy_for_india = true
```

and assign confidence:

```text
HIGH
MEDIUM
LOW
```

---

# 36. Vintage Validation

Every factor must have:

```text
data_year
publication_year
version
```

Do not mix:

```text
2020 grid
2026 fuel
2012 material
```

without exposing the different vintages.

---

# 37. Automated Extraction Priority

Use:

```text
1. official CSV / JSON
2. official XLSX
3. official machine-readable flat file
4. official HTML table
5. official PDF table
6. manual extraction with review
```

Do not scrape a webpage if an official download exists.

---

# 38. Processing Technology

Recommended:

```text
Python
Pandas
openpyxl
requests
BeautifulSoup
pdfplumber
Camelot
hashlib
Pydantic
```

Optional:

```text
DuckDB
```

for fast exploratory joins.

---

# 39. Download Manifest

Create:

```text
metadata/download_manifest.csv
```

Columns:

```text
source_id
agency
dataset
version
url
access_method
downloaded
raw_file
sha256
download_timestamp
manual_review_required
notes
```

---

# 40. Legacy Replacement Map

Create:

```text
metadata/replacement_map.json
```

Example:

```json
{
  "grid_india": {
    "legacy_value": 0.716,
    "action": "REPLACE",
    "new_source_id": "SRC-CEA-V21",
    "new_key": "grid_india_official"
  },

  "grid_gujarat": {
    "action": "REMOVE_OR_RELABEL_DERIVED",
    "reason": "not an official CEA state grid factor"
  },

  "cotton_yarn": {
    "action": "REBUILD",
    "source_strategy": [
      "Textile Exchange India cotton LCA",
      "spinning-stage energy/LCA"
    ]
  }
}
```

---

# 41. Verification Report

For each legacy record produce:

| Field | Meaning |
|---|---|
| legacy_key | Current Chakra key |
| legacy_value | Existing value |
| legacy_source | Existing source label |
| verified_source | New exact source |
| exact_source_record | Table/page/row |
| source_version | Dataset version |
| source_year | Vintage |
| source_boundary | LCA/accounting boundary |
| geography | Geographic scope |
| new_value | Replacement value |
| unit | Canonical unit |
| difference_pct | Difference from legacy |
| status | Verification status |
| action | KEEP / REPLACE / RELABEL / REMOVE |
| notes | Explanation |

---

# 42. Validation Tests

Run automatically:

```text
factor value is numeric
unit is recognized
low <= base <= high
source_id exists
source_url exists
version is non-empty
geography is declared
LCA boundary is declared for material factors
derived value has formula
derived value lists every input
plant-specific values are not marked official
screening benchmarks are not marked audited
```

---

# 43. Cross-File Invariants

After processing:

```text
all intervention target_stream values
must exist in emission/footprint stream taxonomy

all sector references
must resolve

all source IDs
must exist in source_registry.json

all factor units
must be resolvable by factors.py

all material substitutions
must preserve max_substitution_pct

all blocked/capped rules
must still resolve after key renaming
```

---

# 44. Emission Factor Verification Workflow

For each record in legacy `emission_factors.json`:

```text
1. Read key
2. Read value / low / high / unit / scope / source
3. Classify factor group
4. Choose source family
5. Find exact source record
6. Download source artifact
7. Extract raw value
8. Verify unit
9. Verify geography
10. Verify system boundary
11. Verify vintage
12. Convert only if necessary
13. Save raw + normalized
14. Compare against legacy
15. Mark KEEP / REPLACE / RELABEL / REMOVE
```

---

# 45. Intervention Verification Workflow

For each record in legacy `interventions.json`:

Verify separately:

```text
technical applicability
abatement range
capex
savings logic
asset lifetime
difficulty
downtime/disruption
physical ceiling
sector block/cap
evidence
```

Do not assume one source supports the entire intervention.

Example:

```text
VFD

technical eligibility:
motor/system engineering reference

saving range:
BEE DPR / audit

capex:
BEE planning estimate / current vendor quote

lifetime:
manufacturer/engineering reference

plant-specific result:
Chakra calculation
```

---

# 46. Sector Benchmark Verification Workflow

For each sector in `sectors.json`:

```text
1. Identify Chakra sector
2. Identify target Indian cluster(s)
3. Search BEE Energy Mapping / BEE SME / SIDHIEE
4. Extract actual published SEC/range
5. Record sample context
6. Store reported range
7. Do NOT manufacture p25/p50/p75 from min/max
8. If legacy percentiles remain:
   status = SCREENING_ONLY
9. Keep demo plant marked synthetic
```

---

# 47. Recommended Benchmark UI Change

Instead of:

```text
Plant is p78
Sector p75 = X
```

where the corpus is weak, show:

```text
Plant intensity:
9.4 GJ/t

BEE reported range:
6.0–8.9 GJ/t

Position:
Above reported range

Source:
BEE MSME Cluster Study
```

This is more defensible.

---

# 48. Source Badge System

Frontend/API should expose:

```text
GOVERNMENT OFFICIAL
SCIENTIFIC STANDARD
INDUSTRY LCI
PLANT REPORTED
LITERATURE SCREENING
CHAKRA CALCULATED
```

Example:

```json
{
  "value": 0.71,
  "unit": "tCO2/MWh",
  "badge": "GOVERNMENT OFFICIAL",
  "source": "CEA CO2 Baseline Database v21.0"
}
```

---

# 49. What Must Never Be Labelled "Official"

Do not mark these as official:

```text
Chakra MACC
Chakra NPV
Chakra payback
Chakra leak score
Chakra percentile interpolation
demo plant activity data
generic ₹8/kWh
generic 12% cost of capital
current vendor capex without quote
derived Indian coal factor
derived state grid factor
AD net-negative factor built from assumptions
```

---

# 50. Recommended Final Data Files

After verification, Chakra should load:

```text
data/clean/emission_factors_verified.json
data/clean/interventions_verified.json
data/clean/sectors_verified.json
data/clean/regulations_verified.json
data/metadata/source_registry.json
```

Do not load raw files directly during the demo.

---

# 51. Example Final `emission_factors_verified.json`

```json
{
  "metadata": {
    "schema_version": "2.0",
    "generated_at": "ISO timestamp",
    "verification_policy": "primary-source-first"
  },

  "factors": {
    "grid_india": {
      "value": 0,
      "unit": "tCO2e/MWh",
      "scope": 2,

      "source_id": "SRC-CEA-V21",
      "source_record": "exact table/row",

      "geography": "India",
      "boundary": "location-based grid electricity",
      "data_year": "FY2024-25",

      "verification_status": "VERIFIED_OFFICIAL"
    }
  }
}
```

---

# 52. Example Final Source Trace Returned by API

```json
{
  "stream": "electricity",
  "activity": {
    "value": 1200000,
    "unit": "kWh",
    "source_type": "PLANT_REPORTED"
  },

  "factor": {
    "value": 0,
    "unit": "tCO2e/MWh",
    "source_id": "SRC-CEA-V21",
    "status": "VERIFIED_OFFICIAL"
  },

  "result": {
    "value": 0,
    "unit": "tCO2e",
    "status": "CHAKRA_CALCULATED"
  }
}
```

---

# 53. Execution Order

## Phase 1 — Freeze existing data

```text
Copy current JSON to /legacy
Generate inventory of every key
```

## Phase 2 — Build source registry

Register:

```text
CEA
DESNZ
IPCC
GHG Protocol
worldsteel
IAI
Textile Exchange
PlasticsEurope
GCCA
CEPI
FEVE
Smart Freight Centre
BEE
SIDHIEE
ADEETIE
BIS
IEC
SEBI
EU CBAM
CPCB
MoEFCC
```

## Phase 3 — Download primary artifacts

Download machine-readable files first.

## Phase 4 — Process emission factors

Priority:

```text
electricity
fuels
materials
freight
waste
```

## Phase 5 — Process intervention evidence

Use BEE/SIDHIEE/ADEETIE first.

## Phase 6 — Process benchmarks

Replace weak percentile claims with BEE ranges where possible.

## Phase 7 — Verify regulations

Freeze exact rule/circular/version.

## Phase 8 — Run replacement report

Compare legacy vs verified.

## Phase 9 — Update engine

Point FactorDB to verified files.

## Phase 10 — Run Chakra invariants

Must still pass:

```text
stream sum = total
abatement <= target stream
de-rated <= standalone
substitution <= cap
all factor units recognized
```

---

# 54. Definition of Done

The source-verification project is complete when:

```text
□ Every legacy factor has a verification status
□ Every retained factor has an exact source_id
□ Every source is versioned
□ Every source artifact is preserved
□ Every downloaded file has SHA256
□ Every conversion has a formula
□ Every LCA factor has a boundary
□ Every factor has a geography
□ Every benchmark is official-range or labelled screening
□ Every plant-specific field is labelled plant-reported
□ Every derived result is labelled calculated
□ State grid values are removed or labelled derived
□ Cotton/PET/cement/paper/glass have exact factor-level evidence
□ Road/rail uses India-specific freight reference where applicable
□ Waste factors use transparent IPCC methodology
□ BRSR wording matches current SEBI source
□ CBAM output remains explicitly indicative
□ intervention economics distinguish reference estimate from vendor quote
□ source_verification_report.md is generated
```

---

# 55. Final Architecture

```text
              PRIMARY SOURCES
                    │
      ┌─────────────┼──────────────┐
      │             │              │
 India Official   Scientific    Industry LCI
      │             │              │
      └─────────────┼──────────────┘
                    ↓
                RAW FILES
                    ↓
           SOURCE REGISTRY
                    ↓
              EXTRACTION
                    ↓
             NORMALIZATION
                    ↓
              VALIDATION
                    ↓
        VERIFIED REFERENCE JSON
                    ↓
            CHAKRA ENGINE
                    ↑
                    │
             PLANT RECORDS
       bills / invoices / ERP / meter
                    │
                    ↓
             CALCULATIONS
                    ↓
 footprint / leak / MACC / payback / NPV
                    ↓
            TRACEABLE OUTPUT
```

---

# 56. Final Principle

The project should be able to answer this question for **every number on screen**:

```text
Where did this come from?
```

The answer must be one of:

```text
1. An exact primary source record
2. A real plant record
3. A transparent calculation whose inputs are traceable
4. A clearly labelled screening assumption
```

Nothing else should survive into the final verified Chakra dataset.
