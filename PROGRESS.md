# PRANGARA — Progress

**Branch:** `prangara-main-app`
**Roles being built here:** BE-1 (platform/API + carbon engine) and FE-2 (APK/mobile), per `docs/task.md` section 1.
**Not built here:** FE-1 `apps/web/`, BE-2 `backend/data/` evolution, `backend/rag/`, `backend/compliance/`, `backend/logistics/`, `scripts/data/`.

Specification source: `New folder (4)/README_START_HERE.md`, `docs/PRD.md`, `docs/task.md`, `docs/DATA_RAG_COMPLIANCE.md`, `docs/AI_AGENT_PLAYBOOK.md`.

Handoffs: [`HANDOFF_BACKEND.md`](HANDOFF_BACKEND.md), [`HANDOFF_MOBILE.md`](HANDOFF_MOBILE.md).

---

## Status at a glance

| Area | State |
|---|---|
| Deterministic carbon engine | Ported, version-stamped, 85 invariant tests green |
| Platform API (FastAPI) | 83 endpoints, running |
| Database + migrations | 31 tables, Alembic head applied |
| Auth / RBAC / tenant isolation | Done, 12 access-control tests green |
| Assessment + scenarios | Done |
| Evidence vault | Done |
| Marketplace (providers/RFQ/quotes) | Done |
| Action tracking + M&V | Done |
| Event outbox + notifications + audit | Done |
| Conversational intake | Done (deterministic parser; LLM path wired, off by default) |
| Bill / equipment OCR (B1) | Done (rule-based + regex OCR extraction runtime + suggested activity records) |
| Demo seed | Done — 6 accounts, 3 factories, quotes, alerts, one command |
| **Mobile APK (`apps/mobile`)** | **10 screens, typecheck clean, Android bundle builds** |
| Compliance cases + evaluator (B2) | Done — EU CBAM, India CCTS, SEBI BRSR Core with domain event evaluation |
| Sovereign RAG Assistant (B3) | Done — BM25 proxy retrieval over statutory chunks, zero hallucination |
| Logistics routing & pooling (B4) | Done — 4 presets, CVRPTW pooling, circular backhauls, shipment CRUD |
| Report export service (B5) | Done — Vector SVG MACC, Scope 1/2/3 breakdown, HTML/PDF working paper |
| Mobile offline queue idempotency (M2) | Done — client_ref on Evidence, ActivityRecord, and Shipment |
| Factor provenance (BE-2 datasets) | Done — 25/31 factors traced to source |

**Backend tests:** 194 passing (0 failing). **Mobile:** `tsc --noEmit` clean, `expo export --platform android` succeeds.

---

## Done

### Phase 0 — Repository foundation

**BE-1**

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
- `backend/migrations/` — Alembic, reading `DATABASE_URL` from app settings so
  there is no second place to configure the database.
- `.env.example` at the repo root, every key the backend reads.

**FE-2**

- `apps/mobile/` — Expo SDK 57, React Native 0.86, TypeScript strict.
- Design tokens sized for a factory floor, not for a desktop dashboard.
- Typed API client: shared in-flight token refresh, typed errors, explicit
  timeouts, tokens in the Android keystore.
- Four-tab navigation plus pushed detail screens.

### Phase 1 — Manufacturer core

**BE-1**

- **Auth / RBAC** (FR-01). Register, login, refresh with rotation, logout,
  logout-all, `/me`, organization switching. Access tokens are short-lived
  stateless JWTs; refresh tokens are opaque and only their SHA-256 is stored.
- **Tenant isolation.** All factory-scoped access goes through
  `app/services/access.py`. Three paths: platform admin, organization
  membership, explicit per-factory grant. Providers have no path to manufacturer
  data at all. Cross-tenant reads return 404, never 403.
- **Factory service.** Factories, sites, reporting-period profiles, activity
  records, assets. Creating a factory also creates its first draft profile.
- **Assessment service.** `PlantProfile → engine.assess() → snapshot row`, with
  the engine version, factor hash, sector hash and intervention hash persisted
  on every result.
- **Peer benchmarking** (FR-19). Shrinkage toward the literature prior, ported
  onto the platform schema. A factory is never benchmarked against itself, only
  each factory's latest baseline counts, and cohorts under
  `BENCHMARK_MIN_COHORT` report the literature value unchanged.
- **Data quality** (FR-08) using the published weights from
  `docs/DATA_RAG_COMPLIANCE.md` section 31, plus the plausibility checks from §32.
- **Scenarios** (FR-34). A closed set of declarative modifications applied to the
  engine *input*, rerun through the same engine. The baseline is never
  overwritten, and scenario runs are excluded from the benchmark corpus.
  Anything the factor registry cannot express is reported in `unsupported`.
- **Evidence vault** (FR-47). Multipart upload, content-type allow-list,
  streamed size limit, generated storage keys, SHA-256 duplicate detection,
  polymorphic links, human verification step, soft delete.
- **Unit safety.** `app/services/units.py` raises on any unit it cannot convert
  exactly. The task.md invariant "unknown units fail loudly" is a test.

**FE-2**

- Sign in / register, session restore on cold start.
- Factory list with last headline, factory hub, create factory (sector and state
  are pickers — a typo would silently benchmark a foundry against a dairy).
- **Quick results**: footprint with its band, scope split, peer percentile with a
  quartile bar, worst leak points, top three actions with cost *and* carbon,
  the blocked "PRANGARA said no" section, free-money summary, data quality, and
  the version stamp.

### Phase 2 — AI intake

**BE-1**

- **Conversational onboarding** (FR-04). Local Ollama when configured, a
  deterministic number-and-unit parser otherwise. The response says which ran.
  Period is resolved per clause and annualisation happens in code, never in the
  model.
- **Confirmation path.** `POST /api/intake/factories/{id}/confirm` is the only
  route by which an extracted value becomes factory data, and it stamps who
  confirmed it. Extraction endpoints never write.
- **Bill and equipment capture** (FR-05, FR-06). Upload, store as evidence, link
  on confirm. Where no OCR runtime is configured the response says so and
  returns the evidence id so the client falls through to manual entry.

**FE-2**

- **Conversational onboarding screen.** Every proposed value shows its
  confidence and the words it was read from, is editable, and can be switched
  off. Nothing is written until confirm.
- **Bill scan.** Document type picker, camera or gallery, upload, then an
  explicit "what period does this cover" question — because getting that wrong
  is a twelve-fold error, so it is asked rather than assumed.
- **Equipment scan.** Built around PRD FR-06: a nameplate gives rated power, not
  annual emissions, so run hours and load are the screen and the photo is
  evidence. Leaving them blank is allowed and drops confidence, visibly.
- **Evidence capture** with duplicate detection surfaced, not swallowed.
- **Notification centre** with deep links into the right screen.

### Phase 3 — Marketplace (BE-1 half)

- Provider profiles, services, verification (platform-admin only, because
  `docs/AI_AGENT_PLAYBOOK.md` section 17 makes it a human decision).
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
- Compliance case and corrective-action tables exist, ready for BE-2.

### Phase 5 — Governance, access and resilience

**BE-1**

- **Compliance cases** (FR-46, FR-49). Readiness view, case CRUD, corrective
  actions, evidence attachment, close with a recorded reason.
  `POST /api/compliance/evaluate` returns 202 and an event — BE-1 raises the
  request, BE-2 answers it. A case cannot exist without the rule id and
  rule-pack version it rests on. Closing returns every blocker at once, and a
  case marked for human review cannot be closed on an empty record.
- **Membership and delegated factory access** complete FR-01. Invite, remove,
  grant, revoke. A consultant holding a grant cannot pass it on, a provider can
  never hold one, and the last owner of an organization cannot be removed.
  Grants are revoked rather than deleted: who had access and when is audit data.
- **Auth rate limiting** (PRD section 28). Login is limited per account as well
  as per address, because address rotation is cheap and a password is not.
  Refusals carry `Retry-After`.

**FE-2**

- **Offline capture queue.** A capture that fails on the network is stored on
  the device and sent when connectivity returns, with the pending count always
  visible — queued work that is invisible is indistinguishable from lost work.

  Two rules make it safe: only *network* failures are queued (if the server
  answered, the outcome is known and replaying would duplicate a write or repeat
  a refusal), and only user-authored facts are queued. Assessments are never
  queued — replaying one hours later against changed data would produce a result
  the user never saw and did not confirm.

### Tooling

- `python -m scripts.seed_demo --reset` — 6 accounts, 3 factories with full
  activity data, 3 assessments, 52 tracked actions, 3 providers, 3 competing
  quotes, 2 material listings, and a drained outbox so the demo opens with real
  alerts. Idempotent; removes exactly what it created.
- `python -m scripts.export_openapi` — writes `packages/contracts/openapi.json`
  (70 paths, 81 schemas) for the web and mobile clients.

---

## Bugs found and fixed by running it, not just testing it

Three defects only surfaced when the demo path was driven against a live server.
All three are now covered by tests.

1. **Conversational intake annualised a whole message by one period marker.**
   "produce 4200 tonnes a year, use 340,000 units monthly" turned 4,200 t/yr of
   output into 50,400. Output feeds every intensity, so the error would have
   propagated into every benchmark comparison and leak finding. Period is now
   resolved per clause.
2. **"48 crore" became 480,000,000 in a field the engine reads in crore.** Seven
   orders of magnitude on revenue intensity, and it silently moved the plant
   into the largest capex size band.
3. **Every seeded demo account was unable to sign in.** The seed used
   `@…​.invalid`, which the email validator rejects, while reporting success.
   `--reset` also broke with a foreign-key error once anyone had logged in.

Neither (1) nor (2) could reach a stored assessment — intake never writes without
confirmation — but both were presented to the user as the value to confirm,
which is exactly where a twelve-fold error gets waved through.

---

## Next steps

The full task list from here to a deployed product — web dashboard on live data,
every P0/P1 feature, Docker, CI and hosting — is in
[`ROADMAP.md`](ROADMAP.md), with owners, blockers and acceptance criteria per
task.

The highest-value item is **W1/W2**: FE-1's dashboard was built against fixtures
because no backend existed at the time. It calls six endpoints and all six now
resolve against the live API, so most of `FRONTEND-PRD-GAP.md`'s "P0
backend-blocked" rows are no longer blocked.

---

## Merged with `main`

`origin/main` was merged in on 2026-09-12. Three files conflicted
(`.gitignore`, `backend/engine/constants.py`, `backend/engine/factors.py`); all
were resolved in favour of the running system, and main's two Python engine
files were orphans there in any case — its engine is JavaScript and nothing on
main imported them.

**One runtime, both implementations kept.** main carried a Node/Express backend
in the same folders as this one, so `backend/engine/` briefly held both
`assess.py` and `assess.js`. PRD section 3.1 allows exactly one deterministic
engine as the source of truth, so the Node sources moved intact to
[`backend-node/`](backend-node/README.md), which documents what they are and
which parts are worth porting. `backend/` (Python/FastAPI) is the one that runs,
per PRD section 24 and task.md BE-1. Nothing was deleted.

**BE-2's `datasets/` came across and is now wired in.** 300+ files of audited
reference data, including a source registry with publisher, document, version,
URL, retrieval date and a SHA-256 per artefact.
`app/services/provenance.py` joins it to the engine's active factors, and
`GET /api/reference/provenance` traces **25 of 31 factors (81%)** to an official
source. It changes no computed number — a test asserts that — and where the two
registries disagree it reports the difference rather than choosing:

| Factor | Engine | Verified | Δ |
|---|---|---|---|
| `COAL_INDIAN` | 1.70 | 1.504 | −11.5% |
| `STEEL_SECONDARY` | 0.55 | 0.58 | +5.5% |

Coal dominates Scope 1 for a foundry or dyeing plant, so that gap matters.
Which value is right is BE-2's call; adopting either silently would change the
basis of results factories have already been shown.

**One real integrity failure, recorded not rounded away.**
`verify_dataset_authenticity.js` reports 22/23:
`cpcb_hazardous_waste_rules_2016.pdf` is a 140-byte HTML redirect stub, not the
rules document. No emission factor cites `SRC-CPCB-RULES`, so no carbon number
rests on it — it backs compliance rule text, which is not yet implemented.
Re-fetching it is an open BE-2 task.

The web dashboard (FE-1) is on the `Frontend` branch and has not been merged.

---

## Deliberate deviations from the PRD, and why

1. **SQLite is the default database, PostgreSQL is supported.**
   PRD section 24 names PostgreSQL. PRD section 30 requires the seeded demo to
   always work and the core assessment to depend on no external service, so
   `DATABASE_URL` defaults to a local file and every model uses portable types.
   PostGIS and pgvector features (BE-2's logistics and RAG) need PostgreSQL.

2. **Data-quality scoring lives in `backend/app/`, not `backend/data/`.**
   task.md assigns the *scoring* to BE-2. The assessment endpoint needs a score
   today, so the published weights are implemented in the platform layer. BE-2
   owns retuning it; the weights are one dict.

3. **Sector cannot be changed after a factory is created.**
   Changing it would invalidate the benchmark basis of every stored assessment.
   It is a new factory, not an edit.

---

## Not done yet

### Backend (BE-1, mine)

- [ ] Report export (PDF/HTML) — `prototype/backend/report.py` to port
- [ ] Shipment CRUD and vehicle models (Phase 4 BE-1)
- [ ] First run against a real PostgreSQL instance

### Mobile (FE-2, mine)

- [ ] Signed APK (bundling verified; needs an Android SDK or an Expo account)
- [ ] Provider/RFQ actions from mobile (Phase 3 FE-2, "if time permits")
- [ ] Compliance alerts and corrective-action upload (Phase 2 FE-2, blocked)
- [ ] RAG assistant screen (Phase 2 FE-2, blocked)

### Blocked on, or owned by, other roles

- OCR runtime for FR-05 / FR-06 — **BE-2**. Contract, storage and confirmation
  path are ready; both mobile screens already render `fields` and
  `suggested_activity_records` when they start arriving.
- Compliance rule packs and the evaluator — **BE-2**.
  `COMPLIANCE_EVALUATION_REQUESTED` is already emitted on every assessment.
- RAG ingestion, retrieval and citations — **BE-2**.
- OSRM/OR-Tools routing and pooling — **BE-2**.
- Web dashboard — **FE-1**.

---

## Running it

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m alembic upgrade head
python -m scripts.seed_demo
python -m uvicorn app.main:app --reload
```

API docs at `http://localhost:8000/api/docs`. The seed prints the demo accounts;
the password is `prangara-demo-2026`.

Event worker, in a second terminal:

```bash
cd backend && python -m app.workers.outbox
```

### Mobile

```bash
cd apps/mobile
npm install
npm start
```

Press `a` for an emulator, or scan the QR code with Expo Go. On a physical
phone, `localhost` is the phone — the client falls back to the Expo dev host on
port 8000, and `EXPO_PUBLIC_API_URL` overrides it. The Account tab shows which
URL was resolved and whether the API answered.

### Checks

```bash
cd backend && python -m pytest tests -q          # 148 passing
cd apps/mobile && npm run typecheck              # clean
cd apps/mobile && npm run bundle:android         # Android bundle builds
```

---

## Claim boundary

Unchanged from `docs/README_START_HERE.md`. PRANGARA is screening, decision support,
implementation support and evidence/readiness support. It is not a BEE-accredited
audit, a legal assurance service, a regulator, or a carbon-credit verifier, and
it does not replace a site engineering study or a vendor quotation. The API
returns this statement on every sandbox assessment, and the mobile app shows it
on the sign-in screen, the factory hub and the account screen.
