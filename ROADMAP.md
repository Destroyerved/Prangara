# PRANGARA — Roadmap to a working, deployed product

**Updated:** 2026-09-12 · **Branch:** `main`
**Read first:** `README_START_HERE.md` → `PRD.md` → `task.md` → `DATA_RAG_COMPLIANCE.md` → `AI_AGENT_PLAYBOOK.md`, then `PROGRESS.md`, then this file.

This is the task list from where the repository actually is today to **APK +
API + web dashboard, every P0/P1 feature working, deployed**. It is written to
be picked up by a teammate or an AI agent without needing the conversation that
produced it.

Every task states its **owner**, its **files**, what **done** means, and what it
is **blocked by**. Do not start a task whose blocker is open.

---

## 0. Where we actually are

| Surface | State | Lives in |
|---|---|---|
| Deterministic carbon engine | **Working.** 85 invariants green across 10 sectors | `backend/engine/` |
| Platform API (Python/FastAPI) | **Working.** 71 endpoints, 148 tests | `backend/app/` |
| Android APK | **Working.** 10 screens, offline queue, bundle builds | `apps/mobile/` |
| Web dashboard | **Built, but running on fixtures** | `Frontend` branch — not yet merged |
| Reference datasets | **Working.** 25/31 factors traced to source | `datasets/` |
| Node backend | Parked, not running | `backend-node/` |
| **Deployment** | **Nothing exists** — no Docker, no CI, no hosting | — |

### The single biggest unlock

FE-1 built the whole dashboard against fixtures because, in their words, *"No
PRANGARA backend, OpenAPI or shared/generated contracts were found."* That was
true when they built it. It is not true now.

Their client calls six endpoints. **All six resolve against the live API today**
— the one that had drifted (`/api/sector/{key}`) now has an alias. So the web
app is far closer to live than `FRONTEND-PRD-GAP.md` suggests: most of what that
document lists as "BACKEND-BLOCKED P0" is now built and testable.

**Task W1 is therefore the highest-value task in this document.**

---

## 1. Ownership

Unchanged from `task.md` §1. Do not edit another role's folders without the
contract-change protocol in `AI_AGENT_PLAYBOOK.md` §7.

| Role | Owns |
|---|---|
| **FE-1** | `apps/web/` |
| **FE-2** | `apps/mobile/` |
| **BE-1** | `backend/app/`, `backend/engine/`, `backend/migrations/` |
| **BE-2** | `backend/data/`, `datasets/`, RAG, compliance rules, logistics |
| **Anyone** | `deploy/`, `.github/workflows/` — coordinate in the PR |

Contract: `packages/contracts/openapi.json`. Regenerate after any schema change
with `cd backend && python -m scripts.export_openapi`. **No client invents a
field.**

---

## 2. Phase W — Get the web dashboard on live data

> Highest value in the repository. Nothing else makes the product feel real.

### W1 · Merge the `Frontend` branch into `apps/web/` — **FE-1** · ~2h · blocked by: nothing

The branch has a root-level Vite app; the monorepo expects `apps/web/`.

```bash
git checkout main && git pull
git read-tree --prefix=apps/web/ -u origin/Frontend    # or move files by hand
```

Keep `HANDOFF_WEB.md`, `FRONTEND-PRD-GAP.md`, `API-CONTRACT.md` and
`FIXTURE-PROVENANCE.md` — move them to `apps/web/`.

**Done when:** `cd apps/web && npm install && npm run build` succeeds, and
`npm run test` passes.

### W2 · Point the web app at the live API — **FE-1** · ~3h · blocked by: W1

`src/api/client.ts` already reads `VITE_API_BASE_URL`. Set it to
`http://localhost:8000/api` and run the backend.

- All six existing endpoints work unchanged — verified 2026-09-12.
- Delete the fixture fallback from the API path. Keep demo mode, but make it an
  explicit user choice, never a silent fallback (it already is — preserve that).
- `src/api/adapter.ts` is where any field-shape difference gets absorbed. Check
  `packages/contracts/openapi.json` before adding a mapping; the live payload is
  the same engine output the fixtures were transcribed from, so most should pass
  straight through.

**Done when:** every page renders from a running backend with
`datasets/`-backed numbers, and `FIXTURE-PROVENANCE.md` is updated to say which
fixtures remain (ideally: only the offline demo).

### W3 · Wire auth into the web app — **FE-1** · ~4h · blocked by: W2

FR-01 is no longer backend-blocked. `POST /api/auth/register|login|refresh`,
`GET /api/auth/me`. Copy the token-refresh approach from
`apps/mobile/src/api/client.ts` — single shared in-flight refresh, typed errors.

- Store tokens in memory + `sessionStorage`, **not** `localStorage`.
- Use `me.permissions` to hide what a role cannot do. It is a UI convenience —
  the server enforces regardless.
- Add an org switcher using `X-Organization-Id`.

**Done when:** sign in, see only your own factories, sign out, and a 401 returns
you to sign-in without a fixture fallback.

### W4 · Live factory CRUD and intake — **FE-1** · ~6h · blocked by: W3

Replace the local-draft-only Plant Data page with the real endpoints:
`GET/POST /api/factories`, `PUT /api/factories/{id}/profile`,
`POST /api/factories/{id}/activity`,
`POST /api/intake/factories/{id}/confirm`,
`POST /api/factories/{id}/assessments`.

Keep the local draft file feature — it is genuinely good and still useful
offline.

**Done when:** a user can create a factory, enter data, run an assessment, and
see the result, entirely from the web app.

### W5 · Surface what is now available — **FE-1** · ~4h · blocked by: W4

These `FRONTEND-PRD-GAP.md` rows are no longer blocked:

| Gap row | Now available at |
|---|---|
| FR-08 data quality score | `result.data_quality` on every assessment |
| FR-09 factor/source registry | `GET /api/reference/provenance` — **publisher, version, URL, retrieval date, SHA-256** |
| FR-19 cohort metadata | `leaks.benchmark_provenance`, `benchmark_source`, `GET /api/corpus` |
| FR-18 leak evidence state | `result.data_quality.components.evidence_coverage` |
| FR-29 payback nulls | engine returns explicit nulls; keep "Unavailable" |
| FR-46/49 compliance cases | `GET /api/factories/{id}/compliance`, `/api/compliance/cases` |

The Methodology page can finally show real source registry fields instead of
"not supplied". **Also show the two factor discrepancies** the API flags
(`COAL_INDIAN`, `STEEL_SECONDARY`) — that honesty is a differentiator, not a
weakness.

**Done when:** no page says "not supplied" for something the API now supplies.

---

## 3. Phase B — Backend feature completion

### B1 · OCR runtime for bill and nameplate scanning — **BE-2** · ~8h · blocked by: nothing

FR-05, FR-06. The contract, storage, evidence linking and confirmation path are
**built and waiting**. `POST /api/intake/document/extract` currently returns
`extractor: "unavailable"`.

Fill in PaddleOCR (or equivalent) and return `fields` +
`suggested_activity_records`. Both mobile screens already render them the moment
they arrive.

- `backend/app/api/routes_intake.py` — replace the `_OCR_UNAVAILABLE` branch
- Extraction must set `data_state: "extracted_unverified"` and **never** write
  directly — `/confirm` remains the only write path (PRD §29)

**Done when:** photographing a real electricity bill pre-fills the units field
and the user confirms it.

### B2 · Compliance rule evaluator — **BE-2** · ~10h · blocked by: nothing

FR-46. Everything around it exists: case tables, CRUD API, readiness view,
corrective actions, audit trail. `COMPLIANCE_EVALUATION_REQUESTED` is emitted on
every assessment and on `POST /api/compliance/evaluate`.

```python
from app.services import events
events.register(events.COMPLIANCE_EVALUATION_REQUESTED, my_handler)
```

Write `ComplianceCase` rows. Every rule needs `rule_id`, `rule_pack`,
`rule_pack_version` and `source_ids` — the API rejects a case without them.
Reference implementation: `backend-node/compliance/evaluator.js`.
Rule schema: `DATA_RAG_COMPLIANCE.md` §24. **Never invent a threshold.**

**Done when:** running an assessment on a plant with EU export exposure opens a
CBAM screening case with a real source citation, and the event no longer says
"no domain handler registered".

### B3 · RAG assistant — **BE-2** · ~12h · blocked by: nothing

FR-53. `datasets/10_rag_knowledge_base/` already has the corpus.
Pipeline and answer contract: `DATA_RAG_COMPLIANCE.md` §18–22.

- `POST /api/assistant/ask` → `{answer, confidence, citations[], limitations[]}`
- Weak retrieval must return *"I cannot support that answer from the currently
  approved source set"* rather than a guess
- Needs PostgreSQL + pgvector → **do D1 first if you want this on real infra**

**Done when:** "Why was this flagged?" returns an answer with a citation that
actually supports it.

### B4 · Logistics: routing and pooling — **BE-2** · ~10h · blocked by: D1 (PostGIS)

FR-41 to FR-43. `POST /api/routes/plan`, `/api/shipments`, `/api/pooling/match`.
OSRM + OR-Tools. Reference: `backend-node/ml/logistics_optimizer.js`.
Save every field in `DATA_RAG_COMPLIANCE.md` §33 so a route is reproducible.

### B5 · Report export (PDF/HTML working paper) — **BE-1** · ~4h · blocked by: nothing

`prototype/backend/report.py` was deleted in the merge; recover it from git
history (`git show 004af6a:prototype/backend/report.py`) and port it to read a
stored `Assessment`. `GET /api/assessments/{id}/report?fmt=pdf|html`.

**Done when:** a judge can download a working paper with the version stamp on it.

### B6 · Run against PostgreSQL — **BE-1** · ~3h · blocked by: D1

The models are portable and the migration is written for both, but this has
**never actually been run** against PostgreSQL. Budget for surprises: `JSON` vs
`JSONB`, `use_alter` on the assessments/scenarios cycle, timezone handling.

**Done when:** `alembic upgrade head` + `pytest` + `seed_demo` all pass with
`DATABASE_URL=postgresql+psycopg://...`.

### B7 · Fix the broken source artefact — **BE-2** · ~1h · blocked by: nothing

`datasets/07_primary_raw_sources/cpcb/cpcb_hazardous_waste_rules_2016.pdf` is a
140-byte HTML redirect stub, not the rules document.
`verify_dataset_authenticity.js` correctly reports 22/23.

Re-download from <https://cpcb.nic.in/waste-management-rules/>, update the
checksum in `datasets/06_auditing_and_proofs/chakra_source_registry.json`.

Also: that script prints `22 (100.0% Pass Rate)` alongside `Hash Mismatches: 1`
— the percentage is computed wrongly. Fix it, because a "100%" that is not 100%
is worse than no badge.

### B8 · Resolve the two factor discrepancies — **BE-2** · ~2h · blocked by: nothing

`GET /api/reference/provenance` flags:

| Factor | Engine | Verified | Δ |
|---|---|---|---|
| `COAL_INDIAN` | 1.70 | 1.504 | −11.5% |
| `STEEL_SECONDARY` | 0.55 | 0.58 | +5.5% |

Coal dominates Scope 1 for a foundry or dyeing plant, so this changes headline
numbers. **Decide deliberately and record why**, then update
`backend/data/reference/emission_factors.json` and bump `meta.schema_version`.
Changing it changes the content hash, which is intended — past assessments keep
their old stamp.

---

## 4. Phase M — Mobile completion

### M1 · Build a signed APK — **FE-2** · ~3h · blocked by: nothing

Bundling is verified; no APK has been produced.

```bash
cd apps/mobile
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
```
or `npx eas build --platform android --profile preview` with an Expo account.

**Done when:** the APK installs on a real phone, signs in, and photographs a bill.

### M2 · Server-side idempotency for the offline queue — **BE-1 + FE-2** · ~3h · blocked by: nothing

Queued items carry a `clientRef` the backend ignores. Honour it on
`/api/intake/factories/{id}/confirm` and `POST /api/evidence`: same `clientRef`
→ return the original result instead of writing twice.

**Done when:** replaying a queued capture twice creates one row.

### M3 · Provider and RFQ actions on mobile — **FE-2** · ~5h · blocked by: nothing

task.md Phase 3 FE-2. Endpoints exist and are tested: list quotes on an action,
accept one, update job status.

### M4 · Compliance alerts and corrective-action upload — **FE-2** · ~4h · blocked by: B2

### M5 · RAG assistant screen — **FE-2** · ~3h · blocked by: B3

---

## 5. Phase D — Deployment

Nothing exists yet. This is the whole gap between "runs on my laptop" and "has
a URL".

### D1 · Docker Compose for local infra — **anyone** · ~4h · blocked by: nothing

`deploy/docker-compose.yml` with PostgreSQL 16 + PostGIS + pgvector, MinIO, and
the API. Unblocks B3, B4, B6.

```yaml
# postgres (postgis/postgis:16-3.4 + pgvector), minio, api
```

**Done when:** `docker compose up` gives a working API on a real database, and
`seed_demo` runs against it.

### D2 · Dockerfile for the API — **BE-1** · ~2h · blocked by: D1

Multi-stage, non-root user, `HEALTHCHECK` hitting `/api/health`. Run migrations
on start (or as a job). Ship `datasets/` or mount it — the provenance endpoint
degrades gracefully without it, but you want it.

### D3 · CI — **anyone** · ~3h · blocked by: nothing

`.github/workflows/ci.yml`, on push and PR:

```
backend:  pip install -r backend/requirements.txt && pytest backend/tests -q
mobile:   cd apps/mobile && npm ci && npm run typecheck
web:      cd apps/web && npm ci && npm run build && npm run test
data:     node datasets/08_automated_test_suites/test_chakra_invariants.js
contract: python -m scripts.export_openapi && git diff --exit-code packages/contracts/
```

That last line is the important one: it fails the build if someone changes a
schema without regenerating the contract.

**Done when:** a PR that breaks an engine invariant cannot be merged.

### D4 · Deploy the API — **BE-1** · ~4h · blocked by: D2, B6

Render / Railway / Fly.io all work. Required:
- `DATABASE_URL` → managed PostgreSQL
- `JWT_SECRET` → **generated, never the development fallback.** The app refuses
  to start without it when `APP_ENV != development` — that guard is deliberate.
- `STORAGE_BACKEND=minio` + credentials, or S3
- `CORS_ORIGINS` → the deployed web origin
- `APP_ENV=production`
- Run `alembic upgrade head` on release; run the outbox worker as a second process

**Done when:** `https://<api>/api/health` returns `status: ok` with
`features.postgres: true`.

### D5 · Deploy the web dashboard — **FE-1** · ~2h · blocked by: W2, D4

Vercel or Netlify. `VITE_API_BASE_URL=https://<api>/api`. Add the origin to the
API's `CORS_ORIGINS`.

### D6 · Distribute the APK — **FE-2** · ~2h · blocked by: M1, D4

Set `EXPO_PUBLIC_API_URL` to the deployed API and rebuild. Attach the APK to a
GitHub release. Do **not** commit the `.apk` — it is gitignored for good reason.

### D7 · Seed and rehearse the demo — **everyone** · ~2h · blocked by: D4, D5, D6

Run `seed_demo` against production, then walk PRD §32 end to end on the deployed
stack: login → onboarding → scan → assess → leaks → benchmark → recommendation →
blocked/capped → MACC → provider → quotes → evidence → compliance → verification
→ RAG citation.

**Done when:** someone who has never seen the repo can follow `README.md` and
reach a working URL.

---

## 6. Suggested order

Parallel tracks, so four people are never blocked on each other.

```
Now          W1 → W2 → W3 → W4 → W5          (FE-1: the big unlock)
             B1, B2, B7, B8                  (BE-2: no blockers at all)
             M1, B5                          (FE-2 / BE-1: no blockers)
             D1 → D3                         (anyone: infra + CI early)

Then         B6 → D2 → D4                    (Postgres, then ship the API)
             B3, B4                          (needs D1)
             M2, M3

Last         D5, D6 → M4, M5 → D7            (deploy, then the blocked screens)
```

**If you only do four things:** W1+W2 (web on live data), B2 (compliance
evaluator), M1 (an actual APK), D1+D4 (a URL).

---

## 7. Definition of done — the whole product

From `PRD.md` §31 and §36. A feature is done when UI, API, validation,
loading/error/empty states and tests all exist, permissions are enforced, and
source/audit metadata survives.

### P0 — must work on the deployed stack

- [x] Create factory, structured onboarding
- [x] Conversational profile extraction
- [ ] Bill scan (needs **B1**)
- [x] Scope 1/2/3 with uncertainty visible
- [x] Leak rules, peer benchmark
- [x] Recommendations with blocked/capped visible
- [x] Economics correct, de-rated savings bounded
- [ ] MACC and Sankey **rendering from live data** (needs **W2**)
- [x] Calculation traceability — 25/31 factors cite a source document
- [ ] Seeded hero demo runs end to end **on the deployed stack** (needs **D7**)

### P1

- [x] Provider registration, matching, RFQ + quote
- [ ] Route planner, pooling (needs **B4**)
- [x] Evidence upload
- [ ] Compliance evaluation (needs **B2**) — cases/readiness/CRUD already done
- [ ] RAG with citations (needs **B3**)
- [x] Action tracking, baseline vs actual verification

---

## 8. Rules that do not bend

From `AI_AGENT_PLAYBOOK.md` and `PRD.md`. Breaking one is worse than missing a
feature.

1. **The deterministic engine is the source of truth.** No LLM calculates,
   adjusts or overrides a carbon or financial number.
2. **Extraction is never persistence.** Show unconfirmed values with their
   confidence; write only on confirm (PRD §29).
3. **Never invent an emission factor, a regulatory threshold or a source.**
   A number with no source does not ship.
4. **Unknown units fail loudly.** Never assume a quantity is probably right.
5. **Say what you cannot do.** "OCR is not configured" beats a fabricated
   extraction. An honest gap is a feature.
6. **Readiness, not compliance.** Never "certified", "approved" or "guaranteed
   compliant" (`DATA_RAG_COMPLIANCE.md` §34).
7. **Regenerate the contract** after any schema change, and never invent a field
   on the client.
8. **Tenant isolation is not negotiable.** Cross-tenant reads return 404.
   Providers never see manufacturer assessments.

---

## 9. For an AI agent picking up a task

Paste this before the task:

```text
You are working on PRANGARA.

Read, in order: README_START_HERE.md, PRD.md, task.md, DATA_RAG_COMPLIANCE.md,
AI_AGENT_PLAYBOOK.md, PROGRESS.md, ROADMAP.md. Then inspect the folders you own.

Your task is ROADMAP.md task <ID>. Do not start it if its blocker is open.

Rules:
- Only change the folders your role owns (task.md section 1).
- The deterministic engine in backend/engine/ is the source of truth. Do not
  replace a calculation with an LLM, and do not invent factors or thresholds.
- Use packages/contracts/openapi.json. Do not invent API fields. If you need a
  contract change, follow AI_AGENT_PLAYBOOK.md section 7 — contract first.
- Run the tests before you finish:
    backend  → cd backend && python -m pytest tests -q
    mobile   → cd apps/mobile && npm run typecheck
    web      → cd apps/web && npm run build && npm run test
- Do not stop at a plan. Implement it.
- Update PROGRESS.md and your HANDOFF file: what changed, what you ran, what is
  still broken, and the next safe task.
- If something is not working, say so plainly. A known gap is worth more than a
  hidden one.
```

---

## 10. Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m alembic upgrade head
python -m scripts.seed_demo          # password: prangara-demo-2026
python -m uvicorn app.main:app --reload      # http://localhost:8000/api/docs
python -m app.workers.outbox                 # second terminal
python -m pytest tests -q                    # 148 passing
python -m scripts.export_openapi             # after ANY schema change

# Mobile
cd apps/mobile && npm install && npm start
npm run typecheck && npm run bundle:android

# Web (after W1)
cd apps/web && npm install && npm run dev

# Data integrity (BE-2)
node datasets/08_automated_test_suites/test_chakra_invariants.js       # 18/18
node datasets/08_automated_test_suites/verify_dataset_authenticity.js  # 22/23, see B7
```
