# PRANGARA — Progress

**Branch:** `prangara-main-app`
**Roles being built here:** BE-1 (platform/API + carbon engine) and FE-2 (APK/mobile), per `task.md` section 1.
**Not built here:** FE-1 `apps/web/`, BE-2 `backend/data/` evolution, `backend/rag/`, `backend/compliance/`, `backend/logistics/`, `scripts/data/`.

Specification source: `New folder (4)/README_START_HERE.md`, `PRD.md`, `task.md`, `DATA_RAG_COMPLIANCE.md`, `AI_AGENT_PLAYBOOK.md`.

---

## Status at a glance

| Area | State |
|---|---|
| Deterministic carbon engine | Ported, version-stamped, 85 invariant tests green |
| Platform API (FastAPI) | 58 endpoints, running |
| Database + migrations | 29 tables, Alembic head applied |
| Auth / RBAC / tenant isolation | Done, 12 access-control tests green |
| Assessment + scenarios | Done |
| Evidence vault | Done |
| Marketplace (providers/RFQ/quotes) | Done |
| Action tracking + M&V | Done |
| Event outbox + notifications + audit | Done |
| Conversational intake | Done (deterministic parser; LLM path wired, off by default) |
| Bill / equipment OCR | Contract + storage done; extraction runtime pending (BE-2) |
| Mobile APK (`apps/mobile`) | Not started — next |
| Compliance evaluator | Not mine (BE-2). Events are raised and visible. |

**Tests:** 108 passing.

---

## Done

### Phase 0 — Repository foundation (BE-1)

- `backend/engine/` — the PS10 deterministic engine ported unchanged.
  Two additions only, neither touching a calculation:
  - `engine/paths.py` — one place the reference-data directory is resolved,
    overridable with `PRANGARA_REFERENCE_DIR` so BE-2 can point at a frozen
    snapshot or a test fixture.
  - `engine/version.py` — engine version plus a SHA-256 of every reference file,
    which is what makes PRD section 30 auditability checkable after the fact.
  - `FactorDB.list_keys()` added so callers stop reaching into `_flat`.
- `backend/data/reference/` — the three reference JSON files ported. **BE-2 owns
  their content from here.**
- `backend/app/core/` — settings, SQLAlchemy engine/session, JWT + password
  hashing, typed API errors.
- `backend/migrations/` — Alembic, configured to read `DATABASE_URL` from the
  app settings so there is no second place to configure the database.
- `.env.example` at the repo root, every key the backend reads.
- `backend/requirements.txt`.

### Phase 1 — Manufacturer core (BE-1)

- **Auth / RBAC** (FR-01). Register, login, refresh with rotation, logout,
  logout-all, `/me`, organization switching. Access tokens are short-lived
  stateless JWTs; refresh tokens are opaque and only their SHA-256 is stored.
- **Tenant isolation.** All factory-scoped access goes through
  `app/services/access.py`. Three paths: platform admin, organization
  membership, explicit per-factory grant. Providers have no path to manufacturer
  data at all. Cross-tenant reads return 404, never 403.
- **Factory service.** Factories, sites, reporting-period profiles, activity
  records, assets. Creating a factory also creates its first draft profile, so
  nothing has to be assembled by hand before an assessment can run.
- **Assessment service.** `PlantProfile → engine.assess() → snapshot row`, with
  the engine version, factor hash, sector hash and intervention hash persisted
  on every result.
- **Peer benchmarking** (FR-19). Ported the shrinkage-toward-literature blend
  onto the platform schema. A factory is never benchmarked against itself, only
  each factory's latest baseline counts, and cohorts under `BENCHMARK_MIN_COHORT`
  report the literature value unchanged.
- **Data quality** (FR-08) using the published weights from
  `DATA_RAG_COMPLIANCE.md` section 31, plus the plausibility checks from
  section 32.
- **Scenarios** (FR-34). A closed set of declarative modifications applied to the
  engine *input*, rerun through the same engine. The baseline is never
  overwritten, and scenario runs are excluded from the benchmark corpus.
  Anything the factor registry cannot express is reported in `unsupported`
  rather than silently ignored.
- **Evidence vault** (FR-47). Multipart upload, content-type allow-list,
  streamed size limit, generated storage keys, SHA-256 duplicate detection,
  polymorphic links, human verification step, soft delete.
- **Unit safety.** `app/services/units.py` raises on any unit it cannot convert
  exactly. The task.md invariant "unknown units fail loudly" is a test.

### Phase 2 — Intake (BE-1 half)

- **Conversational onboarding** (FR-04). `POST /api/intake/conversation/extract`.
  Uses a local Ollama model when `OLLAMA_BASE_URL`/`OLLAMA_MODEL` are set,
  otherwise a deterministic number-and-unit parser that only reads quantities
  literally present in the user's sentence. The response says which extractor
  ran. Monthly and daily figures are annualised **in code**, never by the model,
  and the annualisation is surfaced as a warning.
- **Confirmation path.** `POST /api/intake/factories/{id}/confirm` is the only
  route by which an extracted value becomes factory data, and it stamps who
  confirmed it. Extraction endpoints never write.
- **Bill and equipment capture** (FR-05, FR-06). Upload, store as evidence, link
  on confirm. Where no OCR runtime is configured the response says so and
  returns the evidence id so the client falls through to manual entry.

### Phase 3 — Marketplace (BE-1 half)

- Provider profiles, services, verification (platform-admin only, because
  `AI_AGENT_PLAYBOOK.md` section 17 makes it a human decision).
- Weighted, explained provider matching (FR-36) — no ML, every match returns its
  reasons.
- RFQ with per-provider invites. The RFQ carries a **copy** of the few fields a
  provider needs, never a reference into the assessment.
- Quotes, with payback/LCOA/NPV recomputed at the quoted price using the
  engine's own formulas (FR-38). Accepting a quote opens an implementation job.
- Raw-material listings with cheapest / lowest-carbon / balanced ranking.
  A carbon claim without a source is rejected at the API.

### Phase 4 — Governance plumbing (BE-1 half)

- **Event outbox.** Events are written in the same transaction as the change.
  `python -m app.workers.outbox` drains them. An event type with no registered
  handler is marked processed **with a note**, so a missing handler is visible
  rather than silent — this is how BE-2's compliance evaluator will attach.
- **Notifications** (FR-54), fanned out only to the factory's organization plus
  live grant holders.
- **Audit log** (FR-48), append-only, with secrets redacted before storage.
- **Action tracking + M&V** (FR-51, FR-52). Expected values are frozen at the
  moment the factory committed; achievement is measured against the *saving*,
  not the absolute value.
- Compliance case and corrective-action tables exist and are ready for BE-2's
  evaluator.

### Tooling

- `python -m scripts.seed_demo --reset` — 6 accounts, 3 factories with full
  activity data, 3 assessments, 52 tracked actions, 3 providers, 3 competing
  quotes, 2 material listings. Idempotent, and every seeded row is identifiable
  and removable.
- `python -m scripts.export_openapi` — writes `packages/contracts/openapi.json`
  (58 paths, 66 schemas) for the web and mobile clients to generate types from.

---

## Deliberate deviations from the PRD, and why

1. **SQLite is the default database, PostgreSQL is supported.**
   PRD section 24 names PostgreSQL. PRD section 30 requires the seeded demo to
   always work and the core assessment to depend on no external service. A
   laptop with no Postgres running must still get a working API, so
   `DATABASE_URL` defaults to a local file and every model uses portable types.
   PostGIS and pgvector features (BE-2's logistics and RAG) need PostgreSQL.

2. **Data-quality scoring lives in `backend/app/`, not `backend/data/`.**
   task.md assigns the *scoring* to BE-2. The assessment endpoint needs a score
   today, so the published weights are implemented in the platform layer. BE-2
   owns retuning and extending it; the weights are in one dict.

3. **Sector cannot be changed after a factory is created.**
   Changing it would invalidate the benchmark basis of every stored assessment.
   It is a new factory, not an edit.

---

## Not done yet

### Next up — FE-2, the APK (`apps/mobile/`)

Expo + React Native + TypeScript, per task.md Phase 1 FE-2:

- [ ] app shell, navigation, mobile design tokens
- [ ] auth flow against `/api/auth/*` with token refresh
- [ ] typed API client from `packages/contracts/openapi.json`
- [ ] factory setup (create, sector/state, quick manual input)
- [ ] conversational onboarding screen against `/api/intake/conversation/extract`
- [ ] bill scan: capture, crop, upload, confirm fields
- [ ] equipment scan: camera, metadata, operating-hours questions, add asset
- [ ] quick results: footprint, top leak, top 3 actions, quick win
- [ ] evidence capture with document type and links
- [ ] notification centre
- [ ] offline/poor-network behaviour
- [ ] Android build

### Backend gaps I still own

- [ ] Member invite and factory-grant API (the access *rule* is enforced and
      tested; the management endpoints are not built)
- [ ] Compliance case CRUD endpoints (tables exist; task.md Phase 2 BE-1)
- [ ] Report export (PDF/HTML) — the PS10 prototype has `report.py` to port
- [ ] Shipment CRUD and vehicle models (Phase 4 BE-1)
- [ ] Rate limiting on auth endpoints (PRD section 28)

### Blocked on, or owned by, other roles

- OCR runtime for FR-05 / FR-06 — **BE-2**. Contract, storage and confirmation
  path are ready; the endpoints report honestly that extraction is unavailable.
- Compliance rule packs and the evaluator — **BE-2**.
  `COMPLIANCE_EVALUATION_REQUESTED` is already emitted on every assessment.
- RAG ingestion, retrieval and citations — **BE-2**.
- OSRM/OR-Tools routing and pooling — **BE-2**.
- Web dashboard — **FE-1**.

---

## Running it

```bash
cd backend
pip install -r requirements.txt
python -m alembic upgrade head
python -m scripts.seed_demo
python -m uvicorn app.main:app --reload
```

API docs at `http://localhost:8000/api/docs`. Demo accounts are printed by the
seed command; the password is `prangara-demo-2026`.

Event worker, in a second terminal:

```bash
cd backend
python -m app.workers.outbox
```

Tests:

```bash
cd backend
python -m pytest tests -q
```

---

## Claim boundary

Unchanged from `README_START_HERE.md`. PRANGARA is screening, decision support,
implementation support and evidence/readiness support. It is not a BEE-accredited
audit, a legal assurance service, a regulator, or a carbon-credit verifier, and
it does not replace a site engineering study or a vendor quotation. The API
returns this statement on every sandbox assessment.
