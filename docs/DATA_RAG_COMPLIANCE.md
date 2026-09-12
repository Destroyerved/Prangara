# PRANGARA — Data, RAG & Compliance Architecture

**Purpose:** Implementation plan for trusted sources, provenance, RAG, compliance evaluation, events and logistics data.  
**Public-source review date:** 2026-09-12

---

# 1. Core Separation

PRANGARA must use two different systems.

## A. Deterministic engine

Used for:

- carbon calculations
- financial calculations
- leak rules
- thresholds
- compliance rule evaluation
- de-rating
- substitution caps

## B. RAG assistant

Used for:

- explanation
- source retrieval
- regulatory context
- methodology Q&A
- evidence guidance
- “why was I flagged?”

**RAG must not decide numeric compliance by itself.**

---

# 2. Source Hierarchy

Priority:

1. official regulator/government notification
2. recognized standard owner
3. official government technical database
4. peer-reviewed research
5. reputable industry methodology/database
6. supplier/vendor declaration
7. internal screening assumption

If two sources conflict:

- store both
- keep effective dates/version
- choose active source through reviewed rule/factor version
- never rewrite historical assessments silently

---

# 3. Core Official/Technical Sources

## 3.1 GHG Protocol

### Corporate Standard

Use for corporate inventory principles and Scope 1/2 structure.

https://ghgprotocol.org/corporate-standard

### Scope 2 Guidance / Standards

https://ghgprotocol.org/standards-guidance

### Corporate Value Chain (Scope 3) Standard

https://ghgprotocol.org/corporate-value-chain-scope-3-standard

Implementation rule:

Unsupported Scope 3 categories are `out_of_scope`, not zero.

---

## 3.2 Central Electricity Authority — Indian Grid

Official:

https://cea.nic.in/cdm-co2-baseline-database/?lang=en

As of September 2026, the CEA page lists **Version 22.0** as the latest baseline database.

Store:

```text
publisher = CEA
database_version
fiscal_year
grid_factor_type
value
unit
geography
source_url
retrieved_at
```

Historical assessments keep the exact factor version they used.

---

## 3.3 IPCC Emission Factor Database

Official:

https://efdb.ipcc-nggip.iges.or.jp/EFDB/main.php

Use as secondary/default factor research source and technical reference.

Store the background reference/applicability, not only the number.

---

# 4. SEBI — BRSR / BRSR Core

Original BRSR Core framework:

https://www.sebi.gov.in/legal/circulars/jul-2023/brsr-core-framework-for-assurance-and-esg-disclosures-for-value-chain_73854.html

Industry Standards on Reporting of BRSR Core:

https://www.sebi.gov.in/legal/circulars/dec-2024/industry-standards-on-reporting-of-brsr-core_90091.html

March 2025 ease-of-doing-business update:

https://www.sebi.gov.in/legal/circulars/mar-2025/measures-to-facilitate-ease-of-doing-business-with-respect-to-framework-for-assurance-or-assessment-esg-disclosures-for-value-chain-and-introduction-of-voluntary-disclosure-on-green-credits_93102.html

PRANGARA behavior:

- keep versioned `BRSR_CORE` rule pack
- store effective date/source URL
- produce readiness/evidence/working papers
- do not call PRANGARA itself an assurance provider

---

# 5. EU CBAM

Official definitive-regime page:

https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en

The definitive regime applies from **1 January 2026**.

Current official page lists selected goods in:

- cement
- iron and steel
- aluminium
- fertilisers
- electricity
- hydrogen

PRANGARA current screening formula may remain an **indicative internal estimate**, but the UI must say:

- confirm product/CN-code coverage
- confirm embedded-emissions method
- confirm current certificate price
- confirm precursor treatment
- not a filing

Never let RAG fetch a live price and silently inject it into a saved calculation.

---

# 6. CPCB / Environmental Monitoring

CPCB:

https://cpcb.nic.in/

Online Monitoring FAQ:

https://www.cpcb.nic.in/upload/thrust-area/FAQs_OnlineMonitoringSystem.pdf

CPCB material describes continuous monitoring of stack/effluent parameters for specified categories and online reporting requirements in relevant cases.

Potential future integrations:

- PM
- NOx
- SO2
- flow
- pH
- COD/BOD
- sector-specific parameters

Important:

```text
carbon_accounting != environmental_pollution_compliance
```

Do not call a NOx/PM exceedance a carbon-footprint exceedance.

---

# 7. MoEFCC / Environment Protection Rules

Use official MoEFCC/CPCB notifications for sector-specific emission/discharge thresholds.

Do not create one universal “legal emission limit” across industries.

Applicability can depend on:

- industry
- process/equipment
- pollutant
- location/state
- notification
- consent conditions

Rule packs therefore need sector + jurisdiction + effective date.

---

# 8. BEE — PAT

Official BEE:

https://beeindia.gov.in/

PAT relates to energy-efficiency obligations for applicable designated energy-intensive consumers.

PRANGARA should only show PAT applicability when the current rule pack says the plant is in scope.

---

# 9. Indian Carbon Market / CCTS

BEE Carbon Market:

https://beeindia.gov.in/show_content.php?lang=1&level=1&lid=294&ls_id=116

Government overview:

https://www.pib.gov.in/PressReleasePage.aspx?PRID=2223703&lang=1&reg=1

Use for future:

- applicability
- readiness
- versioned GEI-target rule packs where officially applicable

Do not:

- issue credits
- claim verification
- imply PRANGARA is an accredited verification agency

---

# 10. Freight Emissions

Smart Freight Centre / GLEC Framework:

https://community.smartfreightcentre.org/news/13311209

Use for harmonized logistics emissions methodology.

Save:

```text
mode
vehicle
fuel
distance
tonne_km
load_factor
empty_running
factor_id
method_version
```

---

# 11. Maps & Routing

## OpenStreetMap

https://www.openstreetmap.org/copyright

OSM data uses ODbL and requires attribution.

## OSRM

https://project-osrm.org/docs/

Use for:

- route
- distance/time matrix
- route alternatives
- trip routing

For reliable demo/production, do not depend blindly on public volunteer infrastructure; self-host/cache where possible.

---

# 12. Materials / Embodied Carbon

## Production-quality option

Ecoinvent:

https://ecoinvent.org/database/

Requires appropriate licensing.

## Educational/hackathon research

ICE / Circular Ecology:

https://circularecology.com/embodied-carbon-footprint-database.html

Important 2026 note:

Treat the educational ICE dataset as educational/research unless appropriate commercial licensing is obtained.

Never scrape a licensed LCA database into production.

---

# 13. Sector / Benchmark Research

Potential supporting sources:

- MoSPI Annual Survey of Industries
- BEE sector studies
- NITI Aayog industry studies
- CPCB sector documents
- peer-reviewed cluster studies
- industry associations

MoSPI metadata:

https://nmds.mospi.gov.in/

ASI is useful for industrial context and structure; it is not automatically an emission-factor database.

---

# 14. Source Registry Schema

Create `source_registry`:

```text
source_id
publisher
title
url
document_type
jurisdiction
sector
topic
version
published_date
effective_from
effective_to
retrieved_at
license
authority_level
review_status
content_hash
supersedes_source_id
notes
```

Authority levels:

```text
A = official legal/regulatory
B = official technical/standard
C = peer reviewed
D = reputable industry
E = vendor
F = internal assumption
```

---

# 15. Emission Factor Registry

```text
factor_id
name
category
scope
geography
sector
base
low
high
unit
source_id
factor_version
valid_from
valid_to
quality_grade
approved
```

Never accept a factor with no unit/source.

---

# 16. Benchmark Registry

```text
benchmark_id
sector
subsector
region
metric
unit
p25
p50
p75
sample_size
source_id
methodology
period
quality_grade
is_demo
```

Literature-derived hackathon benchmarks must be visibly marked as screening/demo data.

---

# 17. RAG Collections

Suggested collections:

```text
ghg_protocol
india_grid
brsr
cbam
cpcb
bee_pat
bee_ccts
sector_research
methodology
internal_prangara
```

Chunk metadata:

```text
chunk_id
document_id
source_id
title
publisher
jurisdiction
topic
sector
version
effective_from
effective_to
page
section
url
authority_level
content_hash
```

---

# 18. RAG Ingestion Pipeline

```text
Official Source/PDF
      ↓
Download
      ↓
Hash
      ↓
Text extraction
      ↓
Heading-aware segmentation
      ↓
Chunk
      ↓
Metadata enrichment
      ↓
Embedding
      ↓
pgvector
```

Recommended chunking:

- target 500–900 tokens
- overlap 80–120
- keep heading path
- keep page number
- avoid splitting numbered rules/tables unnecessarily

---

# 19. Embeddings

Local-first options:

- `bge-m3`
- `nomic-embed-text`
- equivalent well-tested multilingual model

Store embedding model/version.

If model changes, re-index to a new vector version; do not mix incompatible vector spaces.

---

# 20. Retrieval

Use hybrid retrieval:

1. metadata filtering
2. vector similarity
3. lexical/BM25 where available
4. reranking
5. answer from trusted chunks

Example metadata filter:

```text
jurisdiction = EU
topic = CBAM
effective_from <= assessment_date
```

Regulatory metadata filtering is more important than pure semantic similarity.

---

# 21. RAG Answer Contract

```json
{
  "answer": "...",
  "confidence": "high|medium|low",
  "citations": [
    {
      "source_id": "...",
      "title": "...",
      "url": "...",
      "section": "...",
      "page": 0
    }
  ],
  "limitations": []
}
```

If retrieval is weak, return:

> “I cannot support that answer from the currently approved source set.”

---

# 22. RAG System Prompt

```text
You are PRANGARA's compliance and methodology explainer.

Use only retrieved approved sources and structured factory results.
Do not calculate official carbon values.
Do not invent regulatory thresholds.
Do not state that a factory is legally compliant unless the structured rule engine has returned that status from an approved rule pack.
Cite every regulatory statement.
If sources conflict, state the conflict and use only the rule-pack version marked active by the platform.
```

---

# 23. Compliance Engine Layers

## A. Applicability

Does a rule apply?

Inputs:

- country/state
- sector/process
- product
- export destination
- organization type
- value-chain relationship
- reporting period

## B. Requirement

What must exist / be reported / stay under threshold?

## C. Evidence

What proof exists?

## D. Deterministic Evaluation

Apply structured rules.

## E. RAG Explanation

Explain result with official source citations.

Do not merge D and E.

---

# 24. Compliance Rule Schema

```json
{
  "rule_id": "CBAM_SCREEN_001",
  "pack": "CBAM",
  "version": "2026.1",
  "jurisdiction": "EU",
  "effective_from": "2026-01-01",
  "sector": ["iron_steel", "aluminium"],
  "applicability": {},
  "inputs": [],
  "operator": "custom",
  "severity": "high",
  "source_ids": ["..."],
  "message_template": "...",
  "requires_human_review": true
}
```

Every rule is versioned.

---

# 25. Event-Driven Compliance

Event envelope:

```json
{
  "event_id": "uuid",
  "type": "ASSESSMENT_COMPLETED",
  "tenant_id": "uuid",
  "factory_id": "uuid",
  "occurred_at": "ISO timestamp",
  "actor_id": "uuid|null",
  "source": "assessment-service",
  "payload": {},
  "evidence_ids": [],
  "correlation_id": "uuid"
}
```

---

# 26. Events to Implement

## Factory/Data

```text
FACTORY_CREATED
FACTORY_PROFILE_UPDATED
ACTIVITY_RECORD_ADDED
ACTIVITY_RECORD_CORRECTED
ASSET_REGISTERED
EVIDENCE_UPLOADED
EVIDENCE_VERIFIED
EVIDENCE_EXPIRING
EVIDENCE_EXPIRED
```

## Carbon

```text
ASSESSMENT_COMPLETED
FOOTPRINT_INCREASED
DATA_QUALITY_LOW
CRITICAL_LEAK_DETECTED
BENCHMARK_POSITION_WORSENED
```

## Actions

```text
RECOMMENDATION_SELECTED
RFQ_CREATED
QUOTE_ACCEPTED
ACTION_IMPLEMENTATION_STARTED
ACTION_IMPLEMENTATION_COMPLETED
VERIFICATION_COMPLETED
VERIFICATION_UNDERPERFORMED
```

## Compliance

```text
COMPLIANCE_EVALUATION_REQUESTED
COMPLIANCE_RULE_FAILED
COMPLIANCE_RULE_PASSED
COMPLIANCE_CASE_CREATED
CORRECTIVE_ACTION_CREATED
CORRECTIVE_ACTION_DUE
CORRECTIVE_ACTION_OVERDUE
COMPLIANCE_CASE_CLOSED
```

## Regulatory/Data

```text
SOURCE_UPDATED
RULE_PACK_UPDATED
EMISSION_FACTOR_UPDATED
BENCHMARK_UPDATED
```

## Marketplace/Logistics

```text
NEW_PROVIDER_MATCH
NEW_QUOTE
POOL_MATCH_FOUND
ROUTE_EMISSIONS_EXCEED_BASELINE
```

---

# 27. Event Processing

Hackathon architecture:

```text
business transaction
      ↓
events table / outbox
      ↓
worker polls unprocessed events
      ↓
handler
      ↓
compliance evaluation / notification
```

Use database outbox because it is simple and durable.

Production later may add Redis Streams/RabbitMQ; Kafka is unnecessary unless scale requires it.

---

# 28. Compliance Evaluation Example

Event:

```text
ASSESSMENT_COMPLETED
```

Handler:

1. load factory
2. load assessment
3. determine applicable packs
4. evaluate deterministic rules
5. check evidence
6. create/update cases
7. retrieve RAG citations for explanation
8. notify assigned user

Example result:

```text
Case: CBAM_DATA_GAP_01
Severity: HIGH
Status: ACTION REQUIRED
Reason: EU export exposure exists but required product/embedded-emissions evidence is incomplete.
Source: EU Commission CBAM source
Human review: YES
```

---

# 29. Regulation Update Flow

When a newer source arrives:

```text
SOURCE_UPDATED
↓
RAG ingest
↓
admin/domain review
↓
compare old rule pack
↓
create new rule-pack version
↓
tests
↓
activate
↓
RULE_PACK_UPDATED
↓
reevaluate affected factories
```

An LLM is never allowed to activate new legal logic automatically.

---

# 30. Evidence Evaluation

Each rule declares accepted evidence.

Example:

```text
requirement:
  electricity consumption for reporting period

accepted evidence:
  utility_bill
  meter_export
  audited_energy_record

max_age:
  12 months
```

Result:

- present
- missing
- expired
- inconsistent
- needs human review

---

# 31. Data Quality Score

Suggested weights:

```text
Completeness       30
Evidence coverage  25
Freshness          15
Measured vs est.   15
Plausibility       10
Extraction trust    5
```

Keep weighting configurable.

---

# 32. Plausibility Rules

Examples:

- negative activity invalid
- output = 0 with significant material use invalid
- unit mismatch
- invoice outside reporting period
- duplicate invoice hash
- extreme intensity vs sector range → review
- sudden large period change → review

A plausibility flag is not proof of misconduct.

---

# 33. Logistics Reproducibility

Save per route:

```text
origin
destination
distance_km
duration
route_provider
route_provider_version
vehicle_type
fuel_type
load_t
load_factor
empty_running_assumption
emission_factor_id
calculation_version
```

---

# 34. Compliance UI Wording

Use:

- readiness
- risk
- evidence gap
- action required
- screening
- indicative
- human review

Avoid:

- government approved
- legally certified
- guaranteed compliant
- official penalty
- carbon credit generated

unless a real authorized integration provides it.

---

# 35. Maintenance Cadence

Monthly:

- source-link check
- official circular check
- expired factors
- stale provider data

Quarterly:

- rule-pack review
- benchmark review
- intervention economics review

Before competition/demo:

- freeze reference version
- run invariants
- archive source/factor snapshot

---

# 36. Refresh Note

The original project report used a fixed reference snapshot.

Before final competition/commercial use, explicitly review:

- latest CEA baseline version
- current SEBI BRSR/BRSR Core circulars
- EU CBAM definitive-regime guidance
- BEE PAT/CCTS applicability
- CPCB/MoEFCC sector rules

Create a new version rather than silently rewriting past assessments.
