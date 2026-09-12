# Handoff — BE-1 (platform/API + carbon engine)

Branch: `prangara-main-app`
Last updated: 2026-09-12

## Task completed

Phase 0 foundation plus the BE-1 halves of Phases 1 to 4: the deterministic
engine port, the FastAPI platform, auth and RBAC, factories and activity data,
the assessment service, scenarios, the evidence vault, the marketplace, action
tracking and M&V, the event outbox, notifications, the audit log, and the seed
command.

58 endpoints, 29 tables, 108 tests green.

## Files changed

```text
backend/engine/                 ported from prototype/backend/engine, unchanged
backend/engine/paths.py         new - one place the reference dir is resolved
backend/engine/version.py       new - engine + reference content hashes
backend/data/reference/*.json   ported; BE-2 owns the content from here
backend/app/core/               config, database, security, errors
backend/app/models/             29 tables across 6 modules
backend/app/schemas/            Pydantic DTOs - the shared contract
backend/app/api/                11 route modules
backend/app/services/           access, assessment, benchmarks, data quality,
                                events, audit, storage, units, profile mapper,
                                scenario, provider matching, intake, notify
backend/app/workers/outbox.py   event worker
backend/migrations/             Alembic, one revision at head
backend/scripts/                seed_demo.py, export_openapi.py
backend/tests/                  108 tests
packages/contracts/openapi.json generated - the client contract
.env.example                    every key the backend reads
```

## API/schema changes

New surface. The PS10 public endpoints are preserved with the same shapes:

- `GET /api/health` — now also reports engine and reference versions, and which
  optional features this deployment actually has.
- `GET /api/sectors`, `GET /api/reference`, `POST /api/assess`,
  `GET /api/demo/{sector}` — unchanged behaviour, still anonymous.
- `GET /api/sector/{key}` moved to `GET /api/sectors/{key}`.

Everything else is new. `packages/contracts/openapi.json` is the authority;
regenerate it with `python -m scripts.export_openapi` after any schema change.

Two contract points other roles depend on:

- Every error is `{"error": {"code", "message", "details"}}`. Clients branch on
  `code`, never on prose.
- Every assessment carries `version_stamp` and `data_quality`.

## Database migrations

One revision, `b84529f609da_initial_platform_schema`. Run:

```bash
cd backend && python -m alembic upgrade head
```

`assessments` and `scenarios` reference each other, so both foreign keys use
`use_alter`. That cycle is real — a scenario points at the baseline it varies,
and running a scenario produces an assessment — and it is why the test suite
drops its database file rather than calling `drop_all`.

## Commands run

```bash
cd backend
python -m alembic revision --autogenerate -m "initial platform schema"
python -m alembic upgrade head
python -m scripts.seed_demo --reset
python -m scripts.export_openapi
python -m pytest tests -q
python -m uvicorn app.main:app --reload
python -m app.workers.outbox --once
```

## Tests run

108 passing:

- `test_engine_invariants.py` — 85 tests. Every non-negotiable invariant from
  task.md section 15, parameterised across all 10 sectors.
- `test_platform_flow.py` — the demo path from PRD section 32 end to end,
  plus scenario isolation and the loud-failure cases.
- `test_access_control.py` — tenant isolation, provider boundaries, evidence
  scoping, refresh rotation, delegated grants, blocked-intervention override.
- `test_outbox.py` — events become notifications, and never cross a tenant.

## Known issues

1. **SQLite is the default database.** Deliberate, documented in `PROGRESS.md`.
   PostGIS and pgvector work needs `DATABASE_URL` pointed at PostgreSQL. The
   models are portable and the migration runs on both; this has not yet been
   *run* against a real PostgreSQL instance, so budget an hour for the first
   attempt.
2. **No rate limiting on `/api/auth/login`.** PRD section 28 asks for it.
3. **Member invite and factory-grant endpoints are not built.** The access rule
   is enforced and tested; only the management API is missing, so a grant has to
   be inserted directly for now (the test does exactly this).
4. **Report export not ported.** `prototype/backend/report.py` builds the
   PDF/HTML working paper and still needs moving across.
5. **Compliance case CRUD not built.** Tables exist and are migrated.
6. `bcrypt` is used rather than Argon2. PRD FR-01 permits either.

## Dependencies on another role

**BE-2** owns, and these are wired and waiting:

- **OCR runtime.** `POST /api/intake/document/extract` and
  `/api/intake/equipment/extract` store the file, return the `evidence_id`, and
  report `extractor: "unavailable"`. Fill in the extraction and return
  `fields` + `suggested_activity_records`; the confirmation path and the
  evidence linking already work.
- **Compliance evaluator.** Every assessment emits
  `COMPLIANCE_EVALUATION_REQUESTED`. Register a handler with
  `app.services.events.register(...)` and write `ComplianceCase` rows. Until a
  handler exists the event is marked `PROCESSED` with
  `last_error = "no domain handler registered"`, so the gap is visible rather
  than silent.
- **Reference data.** `backend/data/reference/*.json`. Changing a file changes
  its content hash, which is what makes past assessments distinguishable from
  future ones — that is intended, so bump `meta.schema_version` when the shape
  changes.
- **Data quality weights.** Implemented from `DATA_RAG_COMPLIANCE.md` section 31
  in `app/services/data_quality.py`; retuning is yours, the weights are one dict.
- **RAG and logistics.** No backend surface built for either yet.

**FE-1 and FE-2** consume `packages/contracts/openapi.json`.

## Next safe task

Compliance case CRUD (`GET/POST /api/factories/{id}/compliance`,
`/api/compliance/cases/*`). The tables, the event and the audit plumbing are
already in place, so it is route work against an existing schema and does not
collide with BE-2's evaluator.
