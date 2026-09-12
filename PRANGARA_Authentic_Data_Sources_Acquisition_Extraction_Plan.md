# PRANGARA — Authentic Data Sources, Acquisition, Extraction & Processing Plan

**Product:** PRANGARA — Industrial Carbon Intelligence Network  
**Problem Statement:** HackOut'26 PS10 — Industrial Emission Leak-Point Detector & Circular Alternative Recommender  
**PRD Baseline:** v2.0 — 2026-09-12

---

# 1. Goal

This document defines:

- every important data category required by PRANGARA
- the preferred authentic source for that data
- how the data should be downloaded or collected
- how it should be extracted
- how it should be normalized
- how it should be validated
- how it should be classified as official, first-party, screening, or calculated
- how the processed data should enter PostgreSQL / PostGIS / reference JSON
- how provenance should be preserved for UI, RAG, audit, and judge verification

The system must never fabricate missing production, carbon, compliance, price, stock, benchmark, or legal values.

---

# 2. Authenticity Classes

Use these classifications throughout the database and UI.

```text
🟢 OFFICIAL / PRIMARY REFERENCE
Government, regulator, standard owner, scientific body,
official technical database, verified LCI/EPD.

🔵 FIRST-PARTY / OPERATOR REPORTED
Factory, supplier, service provider, fleet operator,
auditor or marketplace participant supplies the value.

🟡 PRANGARA CALCULATED / DERIVED
Calculated deterministically from traceable inputs.

🟠 SCREENING / LITERATURE-DERIVED
Useful for screening but not an official measured value.
```

Examples:

```text
CEA grid factor                    → 🟢
Factory electricity bill           → 🔵
Scope 2 result                      → 🟡
Literature-derived p75 benchmark   → 🟠
```

---

# 3. Final Data Flow

```text
OFFICIAL / PRIMARY SOURCES
          +
FIRST-PARTY DATA
          ↓
RAW STORAGE
          ↓
SOURCE REGISTRY
          ↓
EXTRACTION
          ↓
TYPE CONVERSION
          ↓
UNIT NORMALIZATION
          ↓
VALIDATION
          ↓
DEDUPLICATION
          ↓
CLEAN DATA
          ↓
POSTGRESQL + POSTGIS
          ↓
PRANGARA ENGINE
          ↓
DERIVED RESULTS
          ↓
JSON / GEOJSON / RAG
          ↓
WEB + MOBILE
```

---

# 4. Folder Structure

```text
data/
├── legacy/
│   ├── emission_factors.json
│   ├── interventions.json
│   └── sectors.json
├── raw/
│   ├── cea/
│   ├── desnz/
│   ├── ipcc/
│   ├── ghg_protocol/
│   ├── bee/
│   ├── sidhiee/
│   ├── adeetie/
│   ├── ccts/
│   ├── worldsteel/
│   ├── iai/
│   ├── textile_exchange/
│   ├── plasticseurope/
│   ├── cement_epd/
│   ├── paper_epd/
│   ├── feve/
│   ├── glec_india/
│   ├── bis/
│   ├── iec/
│   ├── sebi/
│   ├── cbam/
│   ├── cpcb/
│   ├── moefcc/
│   ├── equipment/
│   ├── providers/
│   └── geography/
├── extracted/
│   ├── tables/
│   ├── text/
│   ├── ocr/
│   └── documents/
├── clean/
│   ├── emission_factors_verified.json
│   ├── interventions_verified.json
│   ├── sector_benchmarks_verified.json
│   ├── material_lci_verified.json
│   ├── equipment_reference.json
│   ├── provider_reference.json
│   ├── transport_factors.json
│   ├── regulations_verified.json
│   └── compliance_rule_packs/
├── operational/
│   ├── factory_activity/
│   ├── supplier_listings/
│   ├── provider_availability/
│   ├── fleet_availability/
│   ├── quotes/
│   ├── circular_exchange/
│   └── measurement_verification/
├── derived/
│   ├── carbon_results/
│   ├── routes/
│   ├── leak_scores/
│   ├── macc/
│   ├── benchmark_comparisons/
│   └── compliance_results/
├── rag/
│   ├── raw_documents/
│   ├── parsed/
│   ├── chunks/
│   └── manifests/
└── metadata/
    ├── source_registry.json
    ├── source_versions.json
    ├── source_artifacts.json
    ├── download_manifest.csv
    ├── checksums.json
    ├── verification_log.json
    └── unresolved_items.json
```

---

# 5. Source Priority

```text
1. Indian Government / Regulator
2. Standard owner
3. Official technical database
4. International scientific / regulatory body
5. Verified industry LCI / EPD
6. Peer-reviewed research
7. First-party factory/provider/supplier information
8. OEM technical data
9. Internal screening assumptions
```

Avoid primary reliance on Kaggle, random GitHub datasets, blogs, SEO pages, AI-generated values, or uncited spreadsheets.

---

# 6. Source Registry

Create persistent entities:

```text
source_registry
source_versions
source_artifacts
source_extractions
```

## source_registry

```text
source_id
agency
dataset_name
source_type
authority_class
jurisdiction
canonical_url
license
notes
```

## source_versions

```text
source_version_id
source_id
version
publication_date
valid_from
valid_to
reporting_period
retrieved_at
checksum_sha256
```

## source_artifacts

```text
artifact_id
source_version_id
file_name
mime_type
raw_storage_path
download_url
checksum_sha256
retrieved_at
```

## source_extractions

```text
extraction_id
artifact_id
page
table
row
raw_field
raw_value
raw_unit
normalized_field
normalized_value
normalized_unit
conversion_applied
conversion_formula
verification_status
```

---

# 7. CEA — Indian Electricity Grid Factor

## Source

Central Electricity Authority — CO2 Baseline Database

```text
https://cea.nic.in/cdm-co2-baseline-database/?lang=en
```

## Required data

```text
weighted average grid factor
operating margin
build margin
combined margin
reporting period
database version
unit
```

## Extraction

Preferred:

```text
Official XLS/XLSX/CSV
→ official PDF/User Guide if necessary
```

Tools:

```text
pandas.read_excel()
Camelot
Tabula
pdfplumber
```

Preserve raw values and normalize to a canonical carbon-per-electricity unit.

### Rule

Never label a modelled state factor as an official CEA state factor unless CEA directly publishes it.

```text
state-derived factor → DERIVED_TRANSPARENT
```

---

# 8. DESNZ — Fuel Conversion Factors

## Source

UK Government greenhouse-gas conversion factors:

```text
https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting
```

## Data

```text
diesel
natural gas
LPG
other relevant fuels
```

## Extraction

Prefer the official machine-readable flat-file XLSX.

```python
pandas.read_excel()
```

Filter by:

```text
fuel
activity/category
unit
GHG basis
reporting year
```

Store exact source sheet/row, source unit, publication year, and version.

---

# 9. IPCC — Combustion and Waste

## Sources

```text
https://www.ipcc-nggip.iges.or.jp/EFDB/
https://www.ipcc-nggip.iges.or.jp/public/2019rf/
```

## Use for

```text
combustion factors
coal
furnace/residual oil
CH4
N2O
landfill
waste treatment
```

## Processing

If the official factor is reported in an energy unit such as:

```text
kgCO2/TJ
```

but PRANGARA uses:

```text
tCO2/t fuel
```

store:

```text
source_factor
source_unit
NCV
NCV_source
conversion_formula
normalized_factor
normalized_unit
```

The normalized result is derived even when the underlying IPCC factor is authoritative.

---

# 10. GHG Protocol

## Source

```text
https://ghgprotocol.org/
```

## Use

```text
Scope 1 methodology
Scope 2 methodology
Scope 3 structure
biogenic CO2 treatment
inventory principles
```

Download official standards/guidance for methodology and RAG.

Classification:

```text
VERIFIED_METHODOLOGY
```

---

# 11. worldsteel — Steel LCI

## Source

```text
https://worldsteel.org/wider-sustainability/life-cycle-thinking/life-cycle-inventory-data-and-eco-profiles/
```

## Extract product-specific factors where possible

```text
hot rolled coil
cold rolled coil
plate
rebar
sections
galvanized products
```

Store:

```text
material
product
production_route
region
system_boundary
functional_unit
data_year
publication_year
GHG_value
unit
```

Do not use one universal steel factor if product form is known.

---

# 12. International Aluminium Institute

## Source

```text
https://international-aluminium.org/
```

## Data

```text
primary aluminium
recycled aluminium
recycling emissions
```

Store:

```text
system_boundary
geography
data_year
production_route
```

Do not directly compare values that have different LCA boundaries without exposing the difference.

---

# 13. Textile Exchange — Cotton

## Source

```text
https://textileexchange.org/knowledge-center/reports/cotton-life-cycle-assessment/
```

## Extract

```text
country
production system
functional unit
GHG result
boundary
data year
```

Use India-specific data where available.

If the source stops at gin gate, do not rename the value as a finished cotton-yarn factor.

```text
cotton raw-material factor
+
spinning/process factor
=
PRANGARA derived yarn factor
```

unless a direct yarn LCI/EPD exists.

---

# 14. PlasticsEurope — PET / Polymer LCI

## Source

```text
https://plasticseurope.org/sustainability/circularity/life-cycle-thinking/eco-profiles-set/
```

## Extract

```text
polymer
production route
region
functional unit
boundary
GHG value
data year
```

If European data is used as an Indian proxy:

```text
proxy_for_india = true
confidence = MEDIUM
```

---

# 15. Cement / Blended Cement

## Technical standards

BIS:

```text
https://www.bis.gov.in/
```

Use applicable standards such as IS 455 / IS 1489 where relevant.

## Carbon data

Use:

```text
GCCA EPD framework
verified manufacturer EPD
Indian cement EPD where available
```

GCCA:

```text
https://gccassociation.org/sustainability-innovation/environmental-product-declarations/
```

BIS supports technical specification/admissibility; EPD/LCA provides embodied carbon.

---

# 16. Paper / Board

## Source path

```text
CEPI
https://www.cepi.org/
```

Prefer product-specific EPD/LCI and distinguish:

```text
kraft
recycled board
corrugated board
coated paper
```

Do not use one generic paper factor when grade is available.

---

# 17. Glass

## Source

```text
FEVE
https://feve.org/glass-industry-positions/life-cycle-assessment/
```

Extract:

```text
recycled_content_pct
GHG factor
boundary
region
functional unit
year
```

---

# 18. BEE — Sector Energy Benchmarks

## Source

```text
https://beeindia.gov.in/
```

Use:

```text
Energy & Resource Mapping
MSME cluster studies
sector manuals
energy-audit studies
```

## Extract

```text
sector
cluster
process
electricity intensity
thermal intensity
SEC
reported range
mean/median if actually published
sample context
year
```

## Benchmark rule

Never derive p25/p50/p75 from min/max alone.

Use:

```text
benchmark_type =
reported_range
mean
median
percentile_distribution
reference_value
```

Only calculate percentiles from a genuine underlying sample/corpus.

---

# 19. SIDHIEE — Intervention Evidence

## Source

```text
https://sidhiee.beeindia.gov.in/
```

Use:

```text
Detailed Project Reports
post-implementation audits
case studies
cluster manuals
technology demonstrations
```

Extract:

```text
intervention
sector
cluster
baseline consumption
post consumption
saving %
investment
annual saving
payback
technology
implementation context
```

Most extraction will be:

```text
PDF → text/table extraction → manual validation → normalized table
```

Preserve page/table references.

---

# 20. ADEETIE — Energy-Efficient Technologies

## Source

```text
https://adeetie.beeindia.gov.in/energy-efficient-technologies
```

## Data

```text
technology
proposed energy saving %
monetary saving
average investment
payback
sector/application
```

Use as official screening evidence, not as a guaranteed site-specific vendor quote.

---

# 21. Equipment / Nameplate Reference Data

PRANGARA requires reference data for:

```text
motor
compressor
boiler
furnace
DG set
pump
chiller/HVAC
CNC
transformer
```

## Source hierarchy

```text
BEE Standards & Labelling
→ IEC / BIS
→ official OEM datasheet
→ user-confirmed nameplate
```

## Fields

```text
equipment_type
manufacturer
model
rated_power_kw
rated_capacity
efficiency
efficiency_class
fuel
voltage
year
standard
source_id
```

## Scanner flow

```text
Image
→ PaddleOCR
→ extract manufacturer/model/rating
→ reference lookup
→ user confirmation
→ operating-hours/load questions
→ deterministic energy estimate
```

A nameplate alone must never be treated as actual annual energy consumption.

---

# 22. BEE Accredited Energy Auditors

## Source

```text
https://beeindia.gov.in/
```

Use the official accredited auditor directory to seed real provider identities.

Extract where available:

```text
registration number
name
firm
contact
sector experience
location
validity
```

Identity/registration:

```text
🟢 VERIFIED
```

Current availability, fee, and lead time:

```text
🔵 PROVIDER REPORTED
```

---

# 23. BEE ESCO Directory

## Source

```text
https://beeindia.gov.in/
```

Extract:

```text
company
empanelment status
grade if available
validity
location
contact
```

Do not infer current quote/availability from directory membership.

---

# 24. CCTS Accredited Carbon Verification Agencies

## Source

```text
BEE / CCTS
https://beeindia.gov.in/
```

Extract:

```text
agency
certificate number
address
contact
accreditation type
issue date
validity
mechanism
accredited sectors
```

Use for genuine verification-provider badges.

---

# 25. Smart Freight Centre / GLEC India

## Source

```text
https://smartfreightcentre.org/
```

Use current India-specific freight GHG reference values where available.

Extract:

```text
mode
vehicle class
fuel
load factor
TTW/WTW boundary
kgCO2e/t-km
rail factor
```

Normalize to:

```text
kgCO2e_per_tonne_km
```

## Route emission calculation

```text
OSRM route distance
× shipment tonnes
× transport factor
=
transport CO2e
```

Final value:

```text
🟡 CALCULATED
```

---

# 26. OpenStreetMap + OSRM

## Sources

```text
https://www.openstreetmap.org/
https://project-osrm.org/
```

## Use

```text
road network
route
distance
duration
geometry
```

Normalize:

```text
distance_m
distance_km
duration_seconds
GeoJSON LineString
```

OSRM does not provide authoritative transport-carbon factors.

---

# 27. Fleet Data

Live fleet data must come from the fleet operator.

Fields:

```text
vehicle_id
provider_id
vehicle_class
fuel
payload_t
volume_m3
emission_standard
current_location
available_from
available_until
cargo_compatibility
load_status
reported_at
```

Classification:

```text
🔵 OPERATOR REPORTED
```

---

# 28. Raw-Material Marketplace

Live commercial values must come from suppliers.

## Supplier fields

```text
supplier_id
material
grade
product_form
recycled_content_pct
price_per_t
currency
MOQ
stock
location
lead_time
certifications
valid_from
valid_until
reported_at
```

## Carbon fields

Use either:

```text
PRANGARA verified material factor registry
```

or:

```text
verified supplier EPD
```

Never promote an unsupported supplier-entered carbon claim to verified status.

---

# 29. Provider Availability / RFQ / Quotes

## Provider availability

```text
provider_id
service
coverage
available_from
available_until
lead_time
reported_at
```

## Quote

```text
quote_id
provider_id
rfq_id
price
tax
installation_cost
warranty
delivery_time
valid_until
terms
submitted_at
```

Classification:

```text
🔵 PROVIDER REPORTED
```

Never scrape an advertised website price and present it as a current accepted quote.

---

# 30. Circular Exchange

## Supply

```text
material/byproduct
quantity
unit
quality
contamination
frequency
available_from
location
evidence
```

## Demand

```text
required_material
specification
quantity
timing
location
```

Supply/demand:

```text
🔵 FIRST-PARTY
```

Compatibility / match score:

```text
🟡 CALCULATED
```

---

# 31. Shared Industrial Capacity

Correct source:

```text
factory/operator
```

Fields:

```text
asset_type
capacity
specification
available_window
certification
location
price
operator
reported_at
```

Classification:

```text
🔵 OPERATOR REPORTED
```

---

# 32. SEBI — BRSR / BRSR Core

## Source

```text
https://www.sebi.gov.in/
```

Use exact current circular/guidance.

Convert into versioned rule records:

```text
rule_id
framework
metric
entity_type
applicability
mandatory_or_voluntary
effective_from
evidence_required
source_circular
source_clause
```

Extraction:

```text
official PDF/HTML
→ parsing
→ human-reviewed rule encoding
→ versioned rule pack
```

RAG may explain the rule; it must not dynamically create compliance logic.

---

# 33. CCTS

## Sources

```text
https://beeindia.gov.in/
https://powermin.gov.in/
```

## Required data

```text
sector
obligated_entity
product
baseline
GHG intensity target
target year
compliance year
notification
verification requirement
```

## Extraction

Prefer:

```text
official notification
official obligated-entity table
official PDF/XLS/XLSX
```

Pipeline:

```text
download
→ extract
→ normalize sector/entity
→ human verify
→ versioned CCTS rule pack
```

Important:

```text
sector membership ≠ automatically obligated entity
```

---

# 34. EU CBAM

## Source

```text
https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en
```

Use official legislation, guidance, default values, and benchmarks.

Extract:

```text
CN code
product group
default value
benchmark
country where relevant
direct emissions logic
indirect emissions logic
effective date
rule version
```

Prefer XLSX/CSV/structured annex before PDF scraping.

PRANGARA result should be labelled:

```text
INDICATIVE CBAM EXPOSURE
```

unless full legal liability calculation requirements are actually implemented.

---

# 35. CPCB / MoEFCC

## Sources

```text
https://cpcb.nic.in/
https://moef.gov.in/
```

Use exact official documents for:

```text
Solid Waste Management
Plastic Waste / EPR
Hazardous and Other Wastes
Ash Utilisation
sector-specific environmental requirements
```

Extract:

```text
rule_name
notification_number
amendment
publication_date
effective_date
clause
sector
requirement
evidence_type
```

---

# 36. BIS / IEC

## BIS

```text
https://www.bis.gov.in/
```

## IEC

```text
https://www.iec.ch/
https://webstore.iec.ch/
```

Use for equipment/material standards and technical eligibility.

Store:

```text
standard_number
title
edition
year
scope
applicable equipment/material
```

Do not copy proprietary standard content wholesale.

---

# 37. Factory Activity Data

This must come from the factory.

## Evidence hierarchy

```text
meter
→ utility bill
→ purchase invoice
→ ERP export
→ production ledger
→ operator declaration
```

Fields:

```text
activity_id
factory_id
period
stream
quantity
unit
evidence_document_id
source_type
confirmation_status
```

Statuses:

```text
MEASURED
DOCUMENT_CONFIRMED
USER_CONFIRMED
DECLARED
ESTIMATED
MISSING
STALE
```

---

# 38. Bill / Invoice OCR

Supported:

```text
electricity bill
gas bill
fuel invoice
material invoice
waste document
freight invoice
```

Pipeline:

```text
Image/PDF
→ image cleanup
→ PaddleOCR
→ document classifier
→ field extraction
→ type conversion
→ unit normalization
→ plausibility check
→ user confirmation
→ activity record
```

Store both:

```text
raw_extracted_value
normalized_value
```

---

# 39. Measurement & Verification

Correct source:

```text
actual plant measurements
```

Fields:

```text
action_id
baseline_period
reporting_period
baseline_output
actual_output
baseline_electricity
actual_electricity
baseline_fuel
actual_fuel
baseline_material
actual_material
baseline_waste
actual_waste
operating_hours
implementation_date
production_normalization
weather_normalization_if_relevant
evidence_ids
```

Derived outputs:

```text
expected_saving
normalized_expected
measured_saving
achievement_pct
confidence
```

Input data:

```text
🔵 PLANT MEASURED / REPORTED
```

Result:

```text
🟡 CALCULATED
```

---

# 40. RAG Corpus

Approved RAG corpus should contain primary documents from:

```text
CEA
BEE
SIDHIEE
ADEETIE
CCTS
IPCC
GHG Protocol
SEBI
CBAM
CPCB
MoEFCC
BIS metadata
IEC metadata
worldsteel
IAI
Textile Exchange
PlasticsEurope
EPDs
GLEC India
PRANGARA methodology
```

## Pipeline

```text
official artifact
→ checksum
→ parse text
→ section-aware chunking
→ metadata
→ embeddings
→ pgvector
```

Chunk metadata:

```text
chunk_id
source_id
source_version
document_title
page
section
jurisdiction
effective_date
url
checksum
```

Rules:

```text
citation required
unsupported question → explicitly unsupported
regulatory update → admin/human approval
RAG never overwrites deterministic structured values
```

---

# 41. Geography

Use OpenStreetMap and official administrative boundaries where appropriate.

Fields:

```text
location_id
country
state
district
city
postal_code
latitude
longitude
geometry
location_precision
source
```

Precision:

```text
EXACT_GPS
VERIFIED_ADDRESS
CITY_LEVEL
DISTRICT_LEVEL
UNKNOWN
```

Never represent a district centroid as exact factory GPS.

---

# 42. Internal Taxonomy

Maintain curated mappings:

```text
sector
→ activity stream
→ intervention
→ equipment
→ provider category
→ compliance rule
```

Classification:

```text
🟡 CURATED / DERIVED KNOWLEDGE
```

Attach evidence/source IDs where relevant.

---

# 43. Canonical Emission Factor Schema

```json
{
  "factor_id": "EF-001",
  "name": "Example",
  "category": "fuel",
  "scope": 1,
  "base": 0,
  "low": null,
  "high": null,
  "unit": "kgCO2e/unit",
  "gas": "CO2e",
  "gwp_version": null,
  "geography": "India",
  "proxy_for_india": false,
  "system_boundary": "combustion_only",
  "functional_unit": null,
  "source_id": "SRC-001",
  "source_record": "page/table/row",
  "source_value": 0,
  "source_unit": "kgCO2e/unit",
  "data_year": 2026,
  "conversion_applied": false,
  "conversion_formula": null,
  "quality_grade": "HIGH",
  "verification_status": "VERIFIED_OFFICIAL"
}
```

---

# 44. Canonical Benchmark Schema

```json
{
  "benchmark_id": "BM-001",
  "sector": "ceramics",
  "cluster": "Morbi",
  "metric": "thermal_gj_per_t",
  "benchmark_type": "reported_range",
  "range_low": null,
  "range_high": null,
  "mean": null,
  "median": null,
  "p25": null,
  "p50": null,
  "p75": null,
  "unit": "GJ/t",
  "source_id": "SRC-BEE-...",
  "source_record": "page/table",
  "verification_status": "VERIFIED_OFFICIAL_SCREENING"
}
```

---

# 45. Canonical Provider Schema

```json
{
  "provider_id": "PROV-001",
  "name": "Provider Name",
  "provider_type": "ESCO",
  "official_registration": {
    "authority": "BEE",
    "registration_number": "...",
    "status": "verified",
    "valid_until": null,
    "source_id": "SRC-BEE-..."
  },
  "service_categories": [],
  "coverage_area": [],
  "availability": {
    "status": "available",
    "reported_at": "...",
    "source_type": "PROVIDER_REPORTED"
  }
}
```

---

# 46. Canonical Transport Factor Schema

```json
{
  "transport_factor_id": "TF-001",
  "mode": "road",
  "vehicle_class": "...",
  "fuel": "diesel",
  "factor_value": 0,
  "unit": "kgCO2e/t-km",
  "boundary": "WTW",
  "load_factor": null,
  "geography": "India",
  "source_id": "SRC-GLEC-INDIA",
  "source_record": "...",
  "verification_status": "VERIFIED_TECHNICAL_REFERENCE"
}
```

---

# 47. Compliance Rule Schema

```json
{
  "rule_id": "RULE-001",
  "rule_pack": "CCTS",
  "rule_pack_version": "2026.x",
  "jurisdiction": "India",
  "entity_type": "factory",
  "applicability": {},
  "condition": {},
  "required_evidence": [],
  "mandatory_or_voluntary": "MANDATORY",
  "effective_from": "...",
  "effective_to": null,
  "source_id": "SRC-...",
  "source_record": "notification/clause",
  "human_review_required": true
}
```

---

# 48. Operational Freshness

All mutable operational data should include:

```text
reported_at
valid_from
valid_until
source_type
reported_by
verification_state
```

Applies to:

```text
supplier price
supplier stock
provider availability
fleet availability
quotes
shared capacity
circular listings
```

---

# 49. Update Cadence

| Data | Recommended check |
|---|---|
| CEA | On new CEA release |
| DESNZ | Annual |
| IPCC | On methodology update |
| BEE studies | Monthly/quarterly discovery |
| SIDHIEE | Monthly |
| ADEETIE | Monthly |
| CCTS | Weekly during active regulatory change |
| CBAM | Weekly/monthly |
| SEBI/BRSR | Monthly |
| CPCB/MoEFCC | Monthly |
| LCI/EPD | Quarterly |
| Provider registration | Monthly |
| Supplier stock/prices | First-party live |
| Fleet availability | First-party live |
| Plant data | Reporting-period based |
| M&V | Per verification period |
| RAG corpus | On every approved source update |

---

# 50. ETL Structure

```text
etl/
├── cea.py
├── desnz.py
├── ipcc.py
├── bee.py
├── sidhiee.py
├── adeetie.py
├── worldsteel.py
├── iai.py
├── textile_exchange.py
├── plasticseurope.py
├── feve.py
├── glec.py
├── cbam.py
├── sebi.py
├── ccts.py
├── cpcb.py
└── equipment.py
```

Each adapter should implement:

```text
download()
parse()
normalize()
validate()
save_raw()
save_clean()
register_source()
```

---

# 51. Extraction Priority

```text
Official API
→ Official CSV/JSON
→ Official XLS/XLSX
→ Official HTML table
→ Official PDF table
→ Manual extraction + human review
```

Do not scrape HTML if a machine-readable official download exists.

---

# 52. Processing Stack

```text
Python
Pandas
Requests
BeautifulSoup
openpyxl
pdfplumber
Camelot
Tabula
Pydantic
hashlib
PostgreSQL
PostGIS
pgvector
```

Optional:

```text
DuckDB
```

---

# 53. Unit Normalization

Recommended canonical units:

```text
electricity:
kWh, MWh
tCO2e/MWh

liquid fuel:
litres
kgCO2e/litre

gaseous fuel:
Sm3
kgCO2e/Sm3

solid fuel:
tonnes
tCO2e/t

materials:
tonnes
tCO2e/t

freight:
tonne-km
kgCO2e/t-km

money:
INR

thermal energy:
GJ

production:
tonnes/year
```

Always preserve source units alongside normalized units.

---

# 54. LCA Boundary Validation

Track system boundary explicitly:

```text
cradle-to-gate
gate-to-gate
cradle-to-grave
combustion-only
tank-to-wheel
well-to-tank
well-to-wheel
```

Never compare two material factors without checking compatible boundaries.

---

# 55. Geography Validation

Each factor must declare geography:

```text
India
Global
Europe
UK
regional
plant-specific
```

If a foreign factor is used as proxy:

```text
proxy_for_india = true
```

---

# 56. Missing Values

Never:

```text
NULL → 0
```

Never:

```text
missing factor → AI guess
```

Use:

```text
NULL
NOT_REPORTED
UNSUPPORTED
OUT_OF_SCOPE
NEEDS_HUMAN_REVIEW
```

---

# 57. Verification Status

Use:

```text
VERIFIED_GOVERNMENT
VERIFIED_REGULATOR
VERIFIED_STANDARD
VERIFIED_SCIENTIFIC
VERIFIED_INDUSTRY_LCI
VERIFIED_FIRST_PARTY
VERIFIED_DOCUMENT
DERIVED_TRANSPARENT
SCREENING_ONLY
PLANT_SPECIFIC_REQUIRED
NEEDS_REVIEW
STALE
UNRESOLVED
```

---

# 58. UI Source Badges

Display:

```text
Government / Regulator
Scientific Standard
Industry LCI / EPD
Verified Provider
Factory Reported
Supplier Reported
Operator Reported
PRANGARA Calculated
Screening Estimate
```

Do not encode status by color alone.

---

# 59. What Must Never Be Faked

Never fabricate:

```text
factory consumption
supplier price
supplier stock
provider availability
truck availability
quotes
installation CAPEX
actual savings
waste quantities
shared capacity
CCTS applicability
CBAM liability
official compliance status
```

Hackathon-only demo data must include:

```text
data_mode = DEMO_SEEDED
```

---

# 60. Recommended Build Order

## Phase 1 — Core Carbon

```text
CEA
DESNZ
IPCC
GHG Protocol
worldsteel
IAI
cotton
PET
cement
paper
glass
```

## Phase 2 — Benchmarks / Recommendations

```text
BEE
SIDHIEE
ADEETIE
```

## Phase 3 — Equipment

```text
BEE S&L
IEC
BIS
OEM datasheets
```

## Phase 4 — Compliance

```text
CCTS
SEBI/BRSR
CBAM
CPCB
MoEFCC
```

## Phase 5 — Logistics

```text
GLEC India
OSM
OSRM
fleet data
```

## Phase 6 — Provider / Marketplace

```text
BEE auditors
BEE ESCOs
CCTS verification agencies
provider onboarding
supplier onboarding
```

## Phase 7 — Measurement & Verification

```text
baseline data
post-implementation data
normalization
evidence
```

## Phase 8 — RAG

```text
approved primary documents
chunk metadata
embeddings
citations
```

---

# 61. Definition of Done

```text
□ Every reference factor has source_id
□ Every source has version/date
□ Raw artifacts are preserved
□ Every raw artifact has SHA256
□ Every conversion has a formula
□ LCI factors have geography + boundary
□ Factors have explicit units
□ Benchmarks declare benchmark type
□ No fabricated p25/p50/p75
□ Derived state factors are not labelled official CEA
□ Live commercial values are first-party
□ Provider verification and provider availability are separate
□ Supplier carbon factors are source-backed
□ Freight uses documented factors
□ Route emissions are calculated transparently
□ Compliance rules reference exact source/version
□ CCTS applicability is entity-aware
□ CBAM outputs are labelled indicative unless fully supported
□ Factory inputs keep evidence links
□ M&V stores baseline and reporting periods
□ RAG chunks preserve page/section/source metadata
□ Stale operational data can be detected
□ Demo-seeded records are visibly labelled
□ Every important output traces to source or formula
```

---

# 62. Final Architecture

```text
                    PRANGARA
                        │
       ┌────────────────┼────────────────┐
       │                │                │
 OFFICIAL DATA      INDUSTRY LCI     FIRST-PARTY DATA
       │                │                │
CEA                 worldsteel       factories
BEE                 IAI              suppliers
SEBI                Textile Exchange providers
CPCB                PlasticsEurope   fleets
MoEFCC              EPDs             auditors
EU Commission       FEVE             quotes
IPCC                GLEC             M&V
IEC/BIS
       │                │                │
       └────────────────┼────────────────┘
                        ↓
                 SOURCE REGISTRY
                        ↓
                  CLEAN DATABASE
                        ↓
                 PRANGARA ENGINE
                        ↓
                 DERIVED OUTPUTS
       ┌────────────────┼────────────────┐
       │                │                │
   Footprint         Logistics        Economics
   Leak Score        Route CO2e       MACC
   Scenarios         Pool Savings     Payback
   Benchmarks        Match Score      NPV
       │                │                │
       └────────────────┼────────────────┘
                        ↓
                  TRACEABLE UI
```

---

# 63. Final Rule

For every important number shown by PRANGARA, preserve:

```text
value
unit
source type
source name
source version/date
raw source record
formula if derived
assumptions
confidence
freshness
verification status
```

If these cannot be established, show the limitation instead of inventing certainty.
