# backend-node — parallel Node implementation

These files were built on `main` as a Node/Express implementation of the
PRANGARA backend, in parallel with the Python/FastAPI one in `backend/`. They
are preserved here, unchanged, rather than deleted.

**They are not the running backend.** `backend/` is, for three reasons:

1. `PRD.md` section 24 and `task.md` BE-1 both specify Python and FastAPI.
2. The deterministic carbon engine is the source of truth for every number in
   the product (`PRD.md` section 3.1). `backend/engine/` is the PS10 engine
   ported unchanged, with 85 invariant tests from `task.md` section 15 running
   against it across all ten sectors.
3. `backend/` is what the mobile app and `packages/contracts/openapi.json` are
   built against, and what the 139-test suite and the demo seed exercise.

Two implementations of one engine is exactly what `AI_AGENT_PLAYBOOK.md`
section 1 warns about — one repository, one contract layer, clear folder
ownership. Keeping both live would mean two sets of emission factors and two
answers to the same question.

## What is worth taking from here

The parts that are **not** duplicated by `backend/` and are genuinely BE-2's
scope are the interesting ones:

| File | Covers | Status in `backend/` |
|---|---|---|
| `ml/bayesian_benchmarks.js` | benchmark shrinkage | equivalent exists (`app/services/benchmarks.py`) |
| `ml/portfolio_optimizer.js` | portfolio selection | not built |
| `ml/logistics_optimizer.js` | routing / pooling | not built (BE-2, Phase 4) |
| `ml/marketplace_ranker.js` | provider ranking | rule-based equivalent exists (`app/services/provider_match.py`) |
| `rag/rag_service.js`, `rag/citation_formatter.js` | RAG retrieval and citations | not built (BE-2) |
| `compliance/evaluator.js` | rule evaluation | **not built** — `backend/` raises `COMPLIANCE_EVALUATION_REQUESTED` and waits for exactly this |

Porting the evaluator and the RAG service into the Python service is the
highest-value follow-up: the case tables, the CRUD API, the readiness view, the
event and the audit trail are already built and waiting for a handler.

## Running them

There is no `package.json` here; these files came across as sources. To run
them, add one with `express` and whatever `server.js` imports.
