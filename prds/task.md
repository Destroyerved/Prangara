# PRANGARA — task.md

**Team:** 4 people  
**Frontend Engineers:** 2  
**Backend Engineers:** 2  
**Assumed strengths:** one frontend member is strongest in APK/mobile; one backend member is strongest in data.

If real strengths differ, swap names but keep ownership boundaries.

---

# 1. Team Roles

## FE-1 — Web Dashboard / Design System Lead

Owns:

- web app shell
- manufacturer dashboard
- admin dashboard
- compliance dashboard
- provider web workspace
- charts
- tables
- marketplace UI
- web integration

Primary stack:

- React
- TypeScript
- Vite
- Tailwind
- Radix/shadcn primitives
- TanStack Query
- TanStack Table
- D3
- Motion/GSAP

Primary folder:

```text
apps/web/
```

Must not edit backend engine logic.

---

## FE-2 — Mobile / APK Lead

Best member for APK development.

Owns:

- React Native / Expo app
- mobile auth
- camera
- bill scanning flow
- equipment scanning flow
- conversational onboarding
- quick assessment
- alerts
- evidence upload
- provider mobile actions if time permits

Primary stack:

- React Native
- Expo
- TypeScript
- React Query
- Expo Camera
- shared API types

Primary folder:

```text
apps/mobile/
```

---

## BE-1 — Platform/API + Carbon Engine Lead

Owns:

- FastAPI application
- authentication
- RBAC
- factories
- assessments
- existing carbon-engine integration
- marketplace API
- RFQ/quotes
- action tracking
- storage integration
- migrations
- deployment integration

Primary folders:

```text
backend/app/
backend/engine/
backend/migrations/
```

Rule:

Preserve the deterministic engine. Do not move carbon calculations into frontend or LLM.

---

## BE-2 — Data / RAG / Compliance / Optimization Lead

Best member for data.

Owns:

- emission-factor registry
- source provenance
- sectors/benchmarks
- intervention data
- RAG ingestion/retrieval
- compliance rule packs
- event evaluator
- data-quality scoring
- OCR post-processing schemas
- route/logistics optimization
- seeded demo datasets

Primary folders:

```text
backend/data/
backend/rag/
backend/compliance/
backend/logistics/
scripts/data/
```

---

# 2. Folder Ownership Rule

Only the owner of a major folder changes it by default.

Cross-folder change process:

1. create issue/task
2. describe required interface
3. owner implements or approves
4. update shared contract if needed
5. integration commit references both sides

This is mandatory when multiple AI agents are writing code at the same time.

---

# 3. Shared Contracts — Build First

Create:

```text
packages/contracts/
```

Define shared DTOs:

- User
- Role
- Factory
- Site
- PlantProfile
- ActivityRecord
- Asset
- Evidence
- AssessmentRequest
- AssessmentResponse
- ScopeSummary
- Stream
- Leak
- Recommendation
- Portfolio
- Scenario
- Provider
- RFQ
- Quote
- Shipment
- RouteOption
- ComplianceCase
- RAGAnswer
- Event

Backend owns Pydantic models. Frontends consume generated OpenAPI types or mirrored Zod schemas.

No agent may invent a second version of an existing field name.

---

# 4. PHASE 0 — Repository Foundation

## FE-1

- create `apps/web`
- React/Vite/TypeScript setup
- design tokens
- app shell
- route skeleton
- auth screens
- typed API client
- TanStack Query
- error boundary
- loading/empty state primitives

## FE-2

- create `apps/mobile`
- Expo setup
- navigation
- mobile design tokens
- auth flow
- API client
- camera permission shell
- evidence upload shell

## BE-1

- create FastAPI platform app
- PostgreSQL
- SQLAlchemy
- Alembic
- environment configuration
- auth/RBAC
- health endpoint
- CORS
- existing engine service wrapper
- MinIO integration skeleton

## BE-2

- normalize reference-data folder
- source registry schema
- validate factor/intervention/sector JSON
- data-import scripts
- pgvector setup plan
- compliance-rule schema
- seed reference data

## Gate

All must work:

```text
web -> health API
mobile -> health API
backend -> database
backend -> carbon engine
```

---

# 5. PHASE 1 — Manufacturer Core

## FE-1 Tasks

### Manufacturer Overview

Build:

- annual footprint
- uncertainty
- Scope 1/2/3
- potential annual benefit
- quick wins
- top leak cards
- MACC preview
- compliance preview

### Plant Data

- progressive form
- save draft
- evidence badges
- field validation
- Load Demo
- Run Assessment

### Footprint

- Scope cards
- D3 Sankey
- stream table
- details drawer

### Leak Points

- severity filters
- peer strip
- leak cards
- recoverable-to-median
- explanation drawer

### Circular Actions

- intervention table
- quick wins
- cash positive
- blocked/capped section
- recommendation drawer

### Abatement Portfolio

- D3 MACC
- portfolio modes
- totals
- interaction-de-rating explanation

### Definition of Done

- all values API-backed
- no fake numbers silently left in production path
- loading/error/empty states
- responsive at 1920/1440/1280

---

## FE-2 Tasks

### Factory Setup

Screens:

- create factory
- sector/state
- quick manual input

### Conversational Onboarding

- chat-style input
- extracted field review
- missing-field questions
- confirm profile

### Bill Scan

- capture/upload
- crop/preview
- extraction progress
- extracted fields
- confirm/edit

### Equipment Scan

- camera
- photo preview
- extracted metadata
- operating-hours input
- add asset

### Quick Results

- footprint
- top leak
- top 3 actions
- quick-win card
- alerts

### Evidence Capture

- photograph/document
- document type
- date
- link to factory/action/compliance case

---

## BE-1 Tasks

### Auth/RBAC

Implement:

- register/login/refresh
- roles
- organization membership
- factory permissions

### Factory Service

CRUD:

- organizations
- factories
- sites
- profiles
- activity records

### Assessment Service

Wrap engine:

```text
PlantProfile
→ engine.assess()
→ AssessmentResponse
```

Persist assessment snapshot with:

- engine version
- factor version
- sector version
- intervention version

### Evidence API

- local MinIO/S3-compatible upload
- metadata
- file permissions

### Scenario API

- baseline snapshot
- scenario modifications
- rerun engine

---

## BE-2 Tasks

### Factor Registry

- current factors
- source metadata
- low/base/high
- units
- versioning
- quality grade

### Benchmarks

- sector schema
- p25/p50/p75
- cohort metadata
- demo flag
- source

### Intervention Validation

Each intervention must have:

- target
- source
- abatement range
- capex basis
- savings model
- confidence
- applicability
- caveats
- cap/block information

### Data Quality

Implement scoring and field-level states.

### Intake Schemas

Pydantic schemas for:

- electricity bill
- fuel invoice
- material invoice
- equipment nameplate

---

# 6. PHASE 2 — AI Intake, RAG & Compliance

## FE-1

Build:

- compliance workspace
- evidence status
- case list/detail
- source drawer
- RAG assistant panel
- methodology/source-registry UI

## FE-2

Build:

- compliance alerts
- missing evidence tasks
- corrective-action upload
- RAG mobile screen
- notification center

## BE-1

Build:

- compliance case CRUD
- corrective actions
- notifications
- event outbox
- audit logging

## BE-2

Build:

- RAG ingestion
- embedding pipeline
- pgvector retrieval
- citation formatter
- compliance evaluator
- versioned rule packs
- event handlers

Read `DATA_RAG_COMPLIANCE.md` first.

---

# 7. PHASE 3 — Marketplace

## FE-1

- provider directory
- provider detail
- Find Provider from recommendation
- RFQ form
- quote comparison
- raw-material marketplace
- provider web dashboard

## FE-2

- provider result list
- quote notification
- RFQ status
- completion evidence
- provider mobile response if time permits

## BE-1

- provider profiles
- products/services
- verification state
- RFQ
- quotes
- implementation jobs

## BE-2

- provider ranking
- carbon-aware material ranking
- demo provider seed data
- listing validation

---

# 8. PHASE 4 — Logistics

## FE-1

Build:

- map
- route alternatives
- Fastest / Cheapest / Lowest Carbon / Balanced
- route details
- truck-pooling candidates

## FE-2

- create shipment
- pooling opportunity alerts
- mobile shipment status

## BE-1

- shipment CRUD
- fleet/vehicle models
- provider job status

## BE-2

- OSRM integration
- distance/time matrix
- freight emission calculation
- OR-Tools pooling
- balanced scoring
- backhaul prototype

---

# 9. PHASE 5 — Circular Network (P2)

## FE-1

- shared-capacity search/listing
- circular-exchange listing/search
- match cards

## FE-2

- quick create listing
- match notification

## BE-1

- capacity listing CRUD
- circular supply/demand CRUD

## BE-2

- matching rules
- compatibility/ranking

Do not delay P0/P1 for this phase.

---

# 10. Final Integration Ownership

## FE-1 — Web integration owner

Responsible for:

- visual consistency
- no broken routes
- no accidental mock values
- API loading/error states
- desktop demo flow

## FE-2 — Mobile demo owner

Responsible for:

- APK build
- camera permissions
- scan flow
- mobile API configuration
- device demo

## BE-1 — Backend integration owner

Responsible for:

- migrations
- API startup
- engine tests
- database
- storage
- auth
- seed command

## BE-2 — Domain/data owner

Responsible for:

- sources
- factors
- benchmarks
- rule versions
- citations
- RAG corpus
- compliance rules
- logistics data

---

# 11. Git Strategy

Recommended branches:

```text
main
develop
feat/web-dashboard
feat/mobile-apk
feat/backend-platform
feat/data-rag-compliance
```

Merge only when:

- build passes
- tests pass
- owner reviews AI diff
- no unrelated rewrite
- no deletion of another member's code

---

# 12. Environment

Create `.env.example`:

```text
DATABASE_URL=
JWT_SECRET=
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
OLLAMA_BASE_URL=
OLLAMA_MODEL=
EMBEDDING_MODEL=
OSRM_BASE_URL=
APP_ENV=
```

Never commit real secrets.

---

# 13. Seed Data

BE-2 owns:

```text
python scripts/seed_demo.py
```

Seed:

- 1 admin
- 1 manufacturer
- 1 compliance officer
- 3 providers
- 1 hero factory
- 2 extra factories
- activity records
- assets
- assessment
- 3 compliance cases
- 5 provider/material listings
- 3 quotes
- 2 shipments
- 1 pooling opportunity

No manual DB editing should be required for demo.

---

# 14. Testing Ownership

## FE-1

- routes
- charts
- tables
- filters
- responsive web
- error/loading/empty states

## FE-2

- camera permission
- upload failure
- extraction correction
- Android build
- poor-network behavior

## BE-1

- auth
- RBAC
- tenant/factory isolation
- API validation
- assessment integration
- marketplace workflow

## BE-2

- units
- benchmark logic
- data quality
- RAG retrieval
- compliance rules
- route optimization
- source versioning

---

# 15. Non-Negotiable Engine Tests

- stream sum = scope totals
- scope sum = total
- low <= base <= high
- no intervention abates more than target stream
- de-rated <= standalone
- substitution <= cap
- blocked stays blocked
- payback handles zero/negative benefit safely
- fuel switch can be net cost
- unknown units fail loudly
- same input + same versions = same output

---

# 16. AI-Agent Assignment

Use separate AI sessions.

## Agent WEB

Give:

- `PRD.md`
- `task.md`
- design reference
- backend OpenAPI
- only `apps/web`

Prompt:

> You are the web frontend owner. Implement only FE-1 tasks. Do not modify carbon/backend logic. Use real API contracts. Run typecheck/build before finishing and update HANDOFF_WEB.md.

## Agent MOBILE

Give:

- `PRD.md`
- `task.md`
- OpenAPI
- only `apps/mobile`

Prompt:

> You are the APK/mobile owner. Implement FE-2 only. Preserve shared contracts. Build real Android-compatible onboarding, scanning and evidence flows. Run typecheck/build and update HANDOFF_MOBILE.md.

## Agent BACKEND

Give:

- `PRD.md`
- `task.md`
- original engine
- backend folders

Prompt:

> You are BE-1. Preserve the deterministic carbon engine. Build platform APIs, persistence, auth, evidence, marketplace and event outbox. Do not replace carbon formulas with AI. Run tests and update HANDOFF_BACKEND.md.

## Agent DATA

Give:

- `PRD.md`
- `DATA_RAG_COMPLIANCE.md`
- current reference data

Prompt:

> You are BE-2. Own provenance, factors, benchmarks, RAG, compliance and optimization. Never fabricate regulatory thresholds. Every rule must carry source/version. Add tests, seed data and HANDOFF_DATA.md.

---

# 17. Reviewer Agent

Use a separate read-only AI to check:

- API schema mismatch
- security mistakes
- duplicated models
- hardcoded demo values
- missing citations
- unit mistakes
- impossible savings
- tenant leaks
- hidden external runtime dependency

Reviewer returns issues only; owner agents fix them.

---

# 18. 48-Hour Build Order (if applicable)

## H0–H4

- repo/contracts
- DB/auth shell
- web/mobile shell
- engine callable

## H4–H12

- factory form
- assessment endpoint
- overview
- Scope results
- hero seed

## H12–H20

- leaks
- Sankey
- recommendations
- economics
- MACC
- blocked/capped

## H20–H28

- conversational intake
- OCR demo
- data quality
- evidence

## H28–H34

- marketplace
- RFQ
- quote comparison

## H34–H39

- compliance cases
- RAG
- citations

## H39–H42

- route planner/pooling if stable
- integration

## H42–H48

- freeze
- test
- APK build
- offline/demo checks
- rehearsal

---

# 19. Cut Order If Behind

Cut first:

1. backhaul matching
2. shared manufacturing
3. circular exchange
4. supplier portal
5. green finance
6. advanced provider mobile
7. multi-site
8. complex scoring

Do **not** cut:

- Scope 1/2/3
- leak detection
- source traceability
- recommendations
- block/cap
- economics
- MACC
- one onboarding shortcut
- one provider implementation flow
