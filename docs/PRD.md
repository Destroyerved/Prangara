# PRANGARA — Product Requirements Document

**Product:** PRANGARA  
**Descriptor:** Industrial Carbon Intelligence Network  
**Problem Statement:** HackOut'26 PS10 — Industrial Emission Leak-Point Detector & Circular Alternative Recommender  
**Version:** 2.0 — Expanded Platform  
**Date:** 2026-09-12

---

# 1. Executive Summary

PRANGARA is a full industrial decarbonization platform for small and medium manufacturers.

It should answer five questions:

1. **What is my factory emitting?**
2. **Where are the avoidable carbon leak points?**
3. **What should I change first?**
4. **Who can help me implement the change?**
5. **Did the change actually reduce cost and emissions?**

The product flow is:

> **Measure → Detect → Decide → Connect → Implement → Verify**

The existing PS10 engine stays at the center. It calculates Scope 1/2/3, carries uncertainty, detects benchmark-relative leak points, matches circular interventions, calculates economics, applies blocking/capping rules, de-rates interacting interventions, and generates a MACC.

The expanded platform adds:

- Web dashboard
- Android APK/mobile companion
- Role-based workspaces
- Conversational factory onboarding
- Bill/invoice OCR
- Equipment/nameplate scanner
- Factory asset registry
- Data-quality scoring
- Peer benchmarking
- What-if scenarios
- Equipment/service marketplace
- Raw-material marketplace
- RFQ and quote comparison
- Green route planning
- Truck pooling and backhaul matching
- Shared industrial capacity
- Circular exchange / industrial symbiosis
- Compliance readiness
- Event-driven compliance evaluation
- Evidence vault
- Audit trail
- Carbon action tracking
- Measurement & verification
- RAG-based compliance/methodology assistant
- Multi-site and supplier-program readiness

PRANGARA is a **screening and decision-support platform**, not a legal assurance engine, regulator, accredited audit or carbon-credit verifier.

---

# 2. Problem

Industrial SMEs often already possess useful activity data — electricity bills, fuel purchases, material invoices, waste records and transport data — but the information is fragmented and hard to convert into action.

Common problems:

- Owners do not know where the footprint actually comes from.
- Scope 3 material emissions can dominate the footprint but remain invisible in utility bills.
- Generic advice does not tell the owner cost, payback or feasibility.
- Factories cannot easily compare themselves with similar plants.
- Recommendations stop at advice; the owner still needs equipment, materials, vendors and transport.
- Compliance evidence is spread across spreadsheets, bills and certificates.
- Many SMEs do not have a sustainability team.
- Recommendations can be technically invalid for a specific plant.
- Multiple interventions can accidentally double-count savings.
- Regulations, factors and reporting requirements change over time.

PRANGARA connects these activities into one system.

---

# 3. Product Principles

## 3.1 Deterministic calculations first

Use deterministic code for:

- Scope calculations
- emission-factor application
- unit conversion
- uncertainty propagation
- leak rules
- benchmark comparison
- CAPEX/payback/NPV/LCOA
- substitution caps
- interaction de-rating
- compliance rules

AI may assist with:

- conversational data entry
- OCR post-processing
- document extraction
- equipment identification
- RAG explanations
- summarization

AI must **not invent carbon values, legal thresholds or financial outputs**.

## 3.2 Every important number is traceable

Each important result should point to:

- factor ID
- source
- source version/date
- unit
- low/base/high band
- formula
- assumptions
- confidence/data-quality state

## 3.3 The recommender must be able to say “no”

A recommendation may be:

- applicable
- capped
- blocked
- needs site validation

## 3.4 Money and carbon are shown together

Every action should display:

- CAPEX
- annual savings/benefit
- payback
- NPV
- ₹/tCO2e
- tCO2e/year reduced
- difficulty
- disruption days
- confidence

## 3.5 Compliance is readiness, not certification

PRANGARA can flag, explain, request evidence and create corrective actions. It must not claim official legal certification unless a real authorized external process provides it.

---

# 4. User Roles

## 4.1 PRANGARA Admin

Can manage:

- users and roles
- factories/sites
- sectors
- emission factors
- benchmark versions
- intervention library
- block/cap rules
- compliance rule packs
- providers
- marketplace listings
- source registry
- high-risk cases
- platform analytics

## 4.2 Manufacturer / Factory Owner

Can:

- create factory/site
- onboard via form/chat/scan
- upload bills
- register equipment
- run assessment
- view Scope 1/2/3
- view leak points
- compare with peers
- run scenarios
- choose actions
- find providers
- request quotes
- procure materials
- plan logistics
- join truck pooling
- use/list shared capacity
- upload implementation evidence
- track compliance readiness
- verify improvement

## 4.3 Compliance Officer / Consultant

Can:

- access assigned factories
- inspect calculations and sources
- inspect evidence
- review data quality
- review compliance cases
- request missing evidence
- assign corrective action
- review methodology
- compare periods
- generate working papers

## 4.4 Service Provider

Provider types include:

- equipment seller
- installation contractor
- ESCO
- energy auditor
- recycled-material supplier
- recycler
- transporter/fleet provider
- process consultant
- industrial maintenance company
- shared-capacity provider

Can:

- create provider profile
- list service area
- list products/services
- list certifications
- maintain availability
- receive RFQs
- submit quotes
- update job status
- upload completion evidence

---

# 5. Product Surfaces

## 5.1 Web Dashboard — primary product

Use for:

- analytics
- Sankey
- MACC
- benchmarking
- recommendations
- marketplace
- compliance
- admin
- provider workspace

## 5.2 Android APK / Mobile Companion

Use for:

- camera scans
- bill OCR
- equipment scan
- conversational onboarding
- quick assessment
- alerts
- meter/evidence capture
- quick wins
- RFQ/provider updates

Do not reproduce every dense desktop visualization on mobile.

---

# 6. Priorities

- **P0 — Must work:** core PS10 + one end-to-end story.
- **P1 — Should work:** implementation, compliance, evidence and basic logistics.
- **P2 — Prototype:** network features with realistic seeded data.
- **P3 — Roadmap:** live government/SCADA integrations, payments, production ML.

---

# 7. Functional Requirements

## FR-01 Authentication & RBAC — P0

### Build

- email/password login
- organization membership
- role-based permissions
- site/factory access assignment
- protected API routes

### Stack

- FastAPI
- PostgreSQL
- JWT access/refresh tokens
- Argon2/bcrypt

### Key rule

A provider cannot see private manufacturer assessments unless explicitly authorized.

---

## FR-02 Factory Digital Profile — P0

### Fields

- factory/site name
- sector/sub-sector
- state/district
- coordinates
- annual output + unit
- revenue
- employees
- operating days/shifts
- export share / EU export share
- electricity tariff
- cost of capital
- reporting period

### Activity streams

- electricity
- fuels
- materials
- waste
- freight

Frontend → FastAPI → Pydantic → PostgreSQL → clean `PlantProfile` DTO → deterministic carbon engine.

---

## FR-03 Structured Factory Form — P0

Sections:

1. Identity
2. Scale
3. Energy
4. Materials
5. Waste
6. Freight
7. Economics
8. Evidence

Use:

- React Hook Form
- Zod
- save draft
- progressive disclosure
- field-level evidence status

---

## FR-04 Conversational Factory Onboarding — P0

Example user input:

> “We run a textile dyeing unit in Surat, produce 200 tonnes/month, use around 180,000 units of electricity monthly and about 25 tonnes of coal.”

Pipeline:

```text
Natural language
→ LLM structured extraction
→ JSON schema / Pydantic validation
→ unit normalization
→ missing-field detection
→ follow-up questions
→ user confirmation
→ PlantProfile
```

Recommended local-first runtime:

- Ollama
- Qwen-class 7B/8B instruct model or equivalent
- near-zero temperature
- constrained JSON output where possible

The LLM **does not calculate carbon**.

---

## FR-05 Bill / Invoice Scanner — P0

Supported:

- electricity bill
- gas bill
- diesel/fuel invoice
- material invoice
- waste document
- freight invoice

Pipeline:

```text
Image/PDF
→ image cleanup
→ PaddleOCR
→ document classifier
→ structured extraction
→ validation
→ user confirmation
→ activity record + evidence link
```

Extraction statuses:

- `extracted_unverified`
- `user_confirmed`
- `reviewed`

---

## FR-06 Equipment / Nameplate Scanner — P1

Target equipment:

- motor
- compressor
- boiler
- furnace
- DG set
- pump
- chiller/HVAC
- CNC/production machine
- transformer

Pipeline:

```text
Camera
→ OCR
→ optional VLM classification
→ metadata extraction
→ user confirmation
→ operating-hours/load questions
→ deterministic energy estimate
→ emission-factor calculation
```

A photo does **not** directly reveal true annual emissions; usage/load data is required.

Tools:

- PaddleOCR
- optional local VLM
- equipment catalog
- deterministic estimation functions

---

## FR-07 Asset Registry — P1

Store:

- asset ID
- factory/site
- type
- manufacturer/model
- rated power/capacity
- efficiency
- year
- fuel/energy type
- operating hours
- load factor
- maintenance status
- images/nameplate evidence
- estimated energy/emissions
- confidence

---

## FR-08 Data Quality Score — P1

Score 0–100 based on:

- completeness
- evidence coverage
- measured vs estimated
- freshness
- source reliability
- plausibility
- extraction confidence

Field states:

- VERIFIED
- DOCUMENT-CONFIRMED
- DECLARED
- ESTIMATED
- MISSING
- STALE

---

# 8. Carbon Engine

## FR-09 Emission Factor Registry — P0

Store:

```text
factor_id
name
category
scope
base
low
high
unit
geography
sector
source_id
source_title
source_url
source_version
published_date
valid_from
valid_to
license
quality_grade
review_status
notes
```

Factors stay versioned and separate from code.

## FR-10 Scope 1 — P0

Base form:

`activity × emission factor`

Biogenic CO2 is handled according to methodology and reported separately where applicable.

## FR-11 Scope 2 — P0

Location-based electricity:

`electricity kWh × approved grid factor`

Use versioned CEA source data.

## FR-12 Scope 3 — P0

Initial categories:

- purchased materials
- waste
- freight

Unsupported categories are marked `out_of_scope`, not zero.

## FR-13 Uncertainty — P0

Propagate:

- low
- base
- high

to scope totals and headline footprint.

## FR-14 Intensities — P0

Return:

- gate-to-gate intensity
- cradle-to-gate intensity

Only comparable/defined metrics should be benchmarked.

---

# 9. Leak-Point Detection

## FR-15 Benchmark Breach — P0

Trigger when stream intensity > sector p75.

Severity depends on:

- distance above p75
- share of footprint

## FR-16 Material Concentration — P0

Trigger when:

- stream >15% of footprint
- and above sector median where benchmark exists

## FR-17 Structural Hotspot — P0

Trigger when:

- stream >25% of total footprint
- no applicable benchmark exists

## FR-18 Leak Result — P0

Show:

- rule
- severity
- stream
- plant intensity
- p50/p75
- percentile
- footprint share
- recoverable-to-median estimate
- explanation
- evidence/data-quality state

---

# 10. Peer Benchmarking

## FR-19 Anonymous Benchmarking — P0

Show:

- plant
- sector/cluster median
- p25
- p75
- top-quartile range
- percentile

Privacy:

- user's own factories may be compared directly
- third parties only through anonymous cohort statistics
- use configurable minimum cohort size in production

## FR-20 Compare Factories — P1

Metrics:

- total intensity
- electricity
- thermal fuel
- material
- waste
- logistics
- data quality

---

# 11. Circular Recommendation Engine

## FR-21 Intervention Library — P0

Categories:

- energy
- material
- process
- waste
- logistics

Each intervention stores:

- target stream
- sector applicability
- low/base/high abatement
- capex basis
- savings model
- lifetime
- difficulty
- disruption days
- confidence
- evidence/source
- provider category
- prerequisites
- exclusions
- physical ceiling

## FR-22 Matching — P0

Rule-based matching using:

- sector
- target stream
- leak
- asset profile
- baseline activity
- constraints

No black-box recommendation ML is required in V1.

## FR-23 Blocking — P0

Rule can return:

- BLOCKED
- reason
- evidence
- alternative

Expose a visible section:

> **PRANGARA SAID NO**

## FR-24 Capping — P0

Apply:

- max substitution %
- sector cap
- asset/process cap
- available physical quantity

Show exact reason.

---

# 12. Economics

## FR-25 Savings Models — P0

Supported:

1. `avoided_purchase`
2. `tariff_delta`
3. `fuel_switch`
4. `price_delta`
5. `none`

## FR-26 CAPEX — P0

Intervention-specific basis × size/applicable quantity.

Clearly mark planning-grade estimates.

## FR-27 Capital Recovery Factor — P0

`CRF = r(1+r)^n / ((1+r)^n - 1)`

## FR-28 LCOA — P0

`LCOA = (CRF × CAPEX + ΔOPEX - gross savings) / annual abatement`

Negative LCOA = modeled action pays for itself.

## FR-29 Payback & NPV — P0

Return:

- annual net benefit
- simple payback
- NPV
- cash-positive flag

## FR-30 Interaction De-rating — P0

Same-stream interventions apply to the residual baseline sequentially.

Store:

- standalone abatement
- portfolio/de-rated abatement

Never exceed the available stream.

---

# 13. Decision Views

## FR-31 Portfolio Views — P0

- All
- Cash Positive
- Quick Wins

Quick Win:

- payback <= 2 years
- difficulty <= 2

Show totals:

- count
- de-rated abatement
- CAPEX
- net annual benefit
- blended payback
- NPV

## FR-32 MACC — P0

D3 Marginal Abatement Cost Curve:

- width = tCO2e abated
- height = ₹/tCO2e
- zero line
- sorted cheapest first
- tooltip + details drawer
- accessible table equivalent

## FR-33 Sankey — P0

`activity stream → Scope 1/2/3 → total`

Use D3 Sankey, ordered by scope/size.

## FR-34 What-If Simulator — P1

Allow simulation of:

- efficiency change
- solar/open access
- recycled material %
- fuel switch
- logistics mode
- waste recovery
- selected portfolio

Do not overwrite baseline. Store `Scenario` and run the same engine.

---

# 14. Marketplace & Procurement

## FR-35 Provider Directory — P1

Provider fields:

- type
- service categories
- coverage area
- products
- certifications
- rating
- verified status
- lead time
- availability

## FR-36 Recommendation → Provider Match — P1

Each intervention maps to provider category.

Weighted matching inputs:

- compatibility
- distance/service region
- estimated price
- certification
- rating
- availability

No ML needed.

## FR-37 RFQ — P1

Flow:

`Recommendation → Request Quote → Provider Quote → Compare → Accept → Implementation`

Statuses:

- DRAFT
- OPEN
- QUOTED
- SHORTLISTED
- ACCEPTED
- REJECTED
- COMPLETED

## FR-38 Quote Comparison — P1

Compare:

- price
- installation
- warranty
- distance
- revised payback
- provider verification
- delivery time

## FR-39 Raw-Material Marketplace — P1

Listing fields:

- material/grade
- recycled content
- embodied carbon factor + source
- price/t
- MOQ
- stock
- certification
- location

Modes:

- Cheapest
- Lowest Carbon
- Balanced

## FR-40 Carbon-Aware Procurement — P1

Evaluate:

`material embodied carbon + inbound freight carbon + procurement cost`

Keep raw cost/carbon separate; weighted score is user-selectable and transparent.

---

# 15. Logistics

## FR-41 Green Route Planner — P1

Inputs:

- origin/destination
- weight/volume
- cargo type
- deadline
- vehicle
- fuel

Outputs:

- distance
- ETA
- cost
- fuel
- CO2e

Modes:

- Fastest
- Cheapest
- Lowest Carbon
- Balanced

Stack:

- OpenStreetMap
- OSRM
- OR-Tools
- PostGIS

## FR-42 Truck Pooling — P1

Match by:

- origin proximity
- destination proximity
- time windows
- capacity
- cargo compatibility

Optimization:

- CVRP / VRPTW in OR-Tools

Return cost split and estimated CO2 savings.

## FR-43 Backhaul Matching — P2

Match return capacity with compatible freight to reduce empty kilometres.

---

# 16. Circular Network

## FR-44 Shared Industrial Capacity — P2

List spare:

- CNC
- laser
- furnace
- molding
- heat treatment
- packaging
- warehouse

Match on:

- process compatibility
- certification
- capacity
- location
- timing
- cost
- carbon intensity where known

## FR-45 Circular Exchange / Industrial Symbiosis — P2

Match factory by-products/waste with another factory's input requirement.

Supply fields:

- material/by-product
- quantity
- quality
- contamination
- frequency
- location

Demand fields:

- specification
- quantity
- timing
- location

Match on compatibility, quality, volume, timing and distance.

---

# 17. Compliance & Governance

## FR-46 Compliance Readiness — P1

Initial rule packs:

- CBAM screening
- BRSR/BRSR Core readiness
- CPCB/sector evidence flags where configured
- PAT/CCTS applicability where relevant

Statuses:

- READY
- PARTIAL
- MISSING
- AT RISK
- ACTION REQUIRED
- HUMAN REVIEW REQUIRED

Never show “officially compliant” unless an authorized process truly provides that determination.

## FR-47 Evidence Vault — P1

Evidence types:

- bills/invoices
- waste certificates
- calibration certificates
- equipment certificates
- transport records
- installation photos
- vendor quotes
- audit notes
- regulator documents

Storage:

- MinIO locally
- S3-compatible in production

## FR-48 Audit Trail — P1

Track:

- actor
- timestamp
- object
- old/new value
- reason
- evidence
- correlation ID

## FR-49 Compliance Case Management — P1

Case fields:

- rule ID
- source/rule-pack version
- factory
- severity
- status
- reason
- evidence
- due date
- owner
- corrective action
- reviewer

Flow:

`Flagged → Acknowledged → Corrective Action → Evidence Submitted → Review → Closed`

## FR-50 PRANGARA Performance Score — P2

Internal score only.

Possible dimensions:

- carbon efficiency
- energy efficiency
- circular materials
- waste recovery
- logistics
- implementation progress
- data quality
- reporting readiness

Do not represent this as government score/credit.

---

# 18. Implementation Tracking & Verification

## FR-51 Carbon Action Tracker — P1

Lifecycle:

- PROPOSED
- SELECTED
- RFQ
- APPROVED
- IMPLEMENTING
- COMPLETED
- VERIFYING
- VERIFIED
- REJECTED

Link recommendation, provider, quote, expected result, evidence and actual result.

## FR-52 Measurement & Verification — P1

Compare:

- baseline
- normalized expected
- actual

Metrics:

- electricity
- fuel
- material
- waste
- freight
- cost
- tCO2e

Show:

- expected saving
- measured saving
- achievement %
- assumptions
- confidence

This implementation-outcome dataset is where later ML becomes useful.

---

# 19. RAG Assistant

## FR-53 Ask PRANGARA — P1

Use RAG for:

- why was this leak flagged?
- what source supports this factor?
- why was this recommendation capped?
- what evidence is missing?
- what does this regulation require?
- explain this compliance case

RAG never replaces the deterministic calculation engine.

See `DATA_RAG_COMPLIANCE.md`.

---

# 20. Notifications & Events

## FR-54 Event-Driven Alerts — P1

Examples:

- assessment complete
- data quality low
- critical leak
- evidence expiring/expired
- compliance case created
- corrective action due
- new provider quote
- truck pool match
- implementation completed
- verification underperformed
- source/rule-pack updated

Use a database outbox first; add Redis/Celery only when necessary.

---

# 21. Multi-Site & Supplier Programs

## FR-55 Multi-Site Rollup — P2

Company view:

- total footprint
- site ranking
- portfolio
- CAPEX/savings
- data quality
- trend

## FR-56 Supplier Portal — P2

Large customer invites suppliers.

Parent sees:

- completion
- footprint summary
- data quality
- high-risk suppliers
- reduction commitments
- readiness

No supplier can see another supplier's raw data.

---

# 22. Green Finance Pack

## FR-57 Investment Pack — P2

Generate:

- intervention
- CAPEX
- annual savings
- payback
- NPV
- carbon reduction
- evidence
- confidence
- quote
- implementation state

Financing readiness only, not loan approval.

---

# 23. Architecture

Use a **modular monolith** for the hackathon.

Do not build microservices.

```text
React Web ─────┐
               │
React Native ──┼──> FastAPI
               │
Admin UI ──────┘
                    │
        ┌───────────┼─────────────────────┐
        │           │                     │
  Carbon Engine   Platform Modules     AI/RAG Module
   pure Python      PostgreSQL          Ollama/VLM
        │            PostGIS             pgvector
        │               │                   │
 Reference JSON     Marketplace       OCR / retrieval
 Factors            Compliance        explanation
 Sectors            Evidence
 Interventions      Logistics
        │               │
        └───────────┬───┘
                    │
                Event Outbox
                    │
              Background Jobs
```

Preserve the deterministic engine structure:

```text
engine/
  constants.py
  factors.py
  footprint.py
  leaks.py
  macc.py
  assess.py
```

The platform may persist factories and assessment snapshots, while the engine itself should remain pure/testable.

---

# 24. Recommended Stack

## Web

- React
- TypeScript
- Vite
- Tailwind
- Radix/shadcn primitives
- TanStack Query
- TanStack Table
- D3
- Motion/Framer Motion
- GSAP where justified
- Zod
- Lucide

## Mobile

- React Native
- Expo
- TypeScript
- Expo Camera / image picker
- React Query

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic

## Data

- PostgreSQL
- PostGIS
- pgvector

## Storage

- MinIO local/demo
- S3-compatible production

## AI

- Ollama
- PaddleOCR
- local embedding model
- optional local VLM

## Optimization

- OR-Tools
- OSRM
- OpenStreetMap

---

# 25. Core Database Entities

```text
users
organizations
memberships
factories
factory_sites
factory_profiles
activity_records
assets
asset_readings

evidence_documents
evidence_links
data_quality_scores

emission_factors
factor_versions
sectors
sector_benchmarks
interventions
intervention_rules

assessments
assessment_streams
leaks
recommendations
scenarios
portfolios

providers
provider_services
products
material_listings
rfqs
quotes
implementation_jobs

shipments
vehicles
route_options
pool_matches

capacity_listings
circular_supply
circular_demand
circular_matches

compliance_rule_packs
compliance_rules
compliance_cases
corrective_actions

actions
verification_periods
verification_results

rag_sources
rag_documents
rag_chunks

events
notifications
audit_logs
```

---

# 26. API Groups

## Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/me
```

## Factories

```text
GET/POST /api/factories
GET/PATCH /api/factories/{id}
GET/POST /api/factories/{id}/sites
POST /api/factories/{id}/activity
```

## Intake

```text
POST /api/intake/conversation/extract
POST /api/intake/document/extract
POST /api/intake/equipment/extract
```

## Assessment

Preserve/extend:

```text
GET  /api/health
GET  /api/sectors
GET  /api/sector/{key}
GET  /api/reference
POST /api/assess
GET  /api/demo/{key}
```

Platform endpoints:

```text
POST /api/factories/{id}/assessments
GET  /api/assessments/{id}
POST /api/assessments/{id}/scenarios
```

## Marketplace

```text
GET  /api/providers
GET  /api/providers/match
POST /api/rfqs
POST /api/rfqs/{id}/quotes
GET  /api/rfqs/{id}/compare
```

## Logistics

```text
POST /api/routes/plan
POST /api/shipments
POST /api/pooling/match
```

## Compliance

```text
GET  /api/factories/{id}/compliance
POST /api/compliance/evaluate
GET  /api/compliance/cases
POST /api/compliance/cases/{id}/evidence
POST /api/compliance/cases/{id}/close
```

## RAG

```text
POST /api/assistant/ask
GET  /api/sources/{id}
```

---

# 27. Data Source Policy

Priority:

1. official regulator/government
2. standard owner
3. official government technical database
4. peer-reviewed research
5. reputable technical/industry database
6. vendor data
7. internal screening assumption

Every estimate must show source and confidence.

See `DATA_RAG_COMPLIANCE.md`.

---

# 28. Security & Privacy

Minimum:

- tenant isolation
- RBAC
- password hashing
- HTTPS in deployment
- signed file access
- evidence permissions
- audit logs
- PII minimization
- local AI preferred for confidential factory data
- secrets in environment variables
- no API keys in frontend
- auth rate limiting
- file type/size checks

---

# 29. AI Reliability Rules

- extracted values show confidence
- user confirms critical extracted values
- LLM cannot overwrite verified structured values
- RAG answers require citations
- unsupported question → say source set cannot support it
- regulatory threshold changes require versioned human/admin approval
- high-severity cases require human review

---

# 30. Non-Functional Requirements

## Performance

- core deterministic assessment target: <300 ms for normal profile
- OCR/LLM may be asynchronous

## Reliability

- seeded demo must always work
- core assessment should not depend on live third-party APIs

## Auditability

Persist:

- engine version
- factor version
- benchmark version
- intervention version
- compliance rule-pack version
- RAG source/chunk IDs

## Accessibility

- keyboard support
- focus states
- reduced motion
- status not encoded by color alone
- table equivalents for charts

---

# 31. Acceptance Criteria

## P0

- create factory
- structured onboarding
- conversational profile extraction
- bill scan demo
- Scope 1/2/3 works
- uncertainty visible
- leak rules work
- peer benchmark works
- recommendations work
- blocked/capped visible
- economics correct
- de-rated savings bounded
- MACC works
- Sankey works
- quick wins work
- calculation traceability works
- seeded hero demo runs end-to-end

## P1

- provider registration
- provider matching
- RFQ + quote
- route planner
- pooling demo
- evidence upload
- compliance evaluation
- RAG with citations
- action tracking
- baseline vs actual verification

---

# 32. Demo Story

1. Manufacturer logs in.
2. Creates/loads hero factory.
3. Uses conversational onboarding or bill scan.
4. Confirms extracted data.
5. Runs assessment.
6. Shows Scope 1/2/3 and uncertainty.
7. Opens critical leak and peer benchmark.
8. Opens recommendation and economics.
9. Shows a capped/blocked recommendation.
10. Opens MACC.
11. Clicks **Find Provider**.
12. Compares seeded quotes.
13. Shows lower-carbon route/pooling opportunity.
14. Marks action implemented and uploads evidence.
15. Shows readiness/compliance case.
16. Shows baseline vs actual verification.
17. Asks RAG “Why was this flagged?” and displays source citation.

---

# 33. Do Not Build First

Avoid early time on:

- payment gateway
- blockchain/tokens
- official penalty issuance
- training custom vision/ML models
- live SCADA integrations
- microservices
- large social/network features

Core accuracy + one complete story wins first.

---

# 34. Roadmap

## Phase 1 — Core intelligence

- intake
- footprint
- leaks
- benchmark
- recommendations
- economics
- MACC/Sankey

## Phase 2 — Implementation

- marketplace
- RFQ
- procurement
- logistics
- evidence
- action tracking

## Phase 3 — Governance

- compliance cases
- RAG
- events
- M&V
- supplier portal

## Phase 4 — Network

- shared manufacturing
- circular exchange
- backhaul network
- multi-site

## Phase 5 — Learning system

Only after real outcome data exists:

- site-specific savings prediction
- intervention success probability
- anomaly detection
- learned benchmarks
- improved abatement priors

---

# 35. Success Metrics

Product:

- assessment completion rate
- time to first result
- action-selection rate
- quote-request rate
- action completion rate
- predicted vs measured savings
- verified tCO2e reduction
- data-quality score

Platform:

- provider response time
- quote conversion
- freight km avoided
- pooled utilization
- lower-carbon material substitution
- shared-capacity utilization

Trust:

- outputs with source trace
- compliance cases with evidence
- extraction correction rate
- RAG citation coverage
- reproducibility by version

---

# 36. Definition of Done

A feature is done only when:

1. UI exists if required.
2. API exists if required.
3. validation exists.
4. loading/error/empty states exist.
5. core logic has tests.
6. no fabricated production values.
7. source/audit metadata is preserved.
8. permissions are enforced.
9. mobile/web behavior is checked where relevant.
10. handoff notes are updated.
