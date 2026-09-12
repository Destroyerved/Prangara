# PRANGARA — AI Agent Development Playbook

This project will be built with multiple AI coding/research agents while the human team may not be able to manually implement or debug every part.

The goal of this file is to keep all agents aligned.

---

# 1. Golden Rule

> **One repository. One PRD. One contract layer. Clear folder ownership.**

AI agents are implementation assistants, not independent product managers.

They must not silently:

- change scope
- rename API fields
- invent emission factors
- invent regulatory limits
- replace the deterministic engine
- introduce unrelated frameworks
- rewrite another agent's folder
- present fake data as real

---

# 2. Files Every Agent Must Read

Read in order:

1. `README_START_HERE.md`
2. `PRD.md`
3. `task.md`
4. `DATA_RAG_COMPLIANCE.md`
5. current carbon-engine report/docs
6. shared contracts/OpenAPI
7. only then code

Tell every agent:

> Do not code until you have inspected these files and the folders you own.

---

# 3. Agent Roles

## Agent WEB

Scope:

```text
apps/web/
```

Good use:

- Codex/Astra for implementation
- Claude/Gemini for visual review and architecture review

## Agent MOBILE

Scope:

```text
apps/mobile/
```

Owns APK/mobile only.

## Agent BACKEND

Scope:

```text
backend/app/
backend/engine/
backend/migrations/
```

## Agent DATA

Scope:

```text
backend/data/
backend/rag/
backend/compliance/
backend/logistics/
scripts/data/
```

## Agent REVIEWER

Read-only review. No major refactors.

---

# 4. Standard Prompt Header

Paste this before each coding task:

```text
You are working on PRANGARA.

Before changing code:
1. Read README_START_HERE.md.
2. Read PRD.md.
3. Read task.md.
4. Read DATA_RAG_COMPLIANCE.md if your work touches carbon, data, RAG, compliance, OCR, logistics or regulatory sources.
5. Inspect the current repository.
6. Identify the exact files/folders you own.

Rules:
- Do not change product scope.
- Do not invent API fields.
- Do not modify another role's folder unless required by an agreed contract change.
- Existing deterministic carbon engine is source of truth.
- AI cannot invent emission factors or regulatory thresholds.
- Use real API data; clearly mark demo fixtures.
- Run relevant tests/build/lint/typecheck before finishing.
- Do not stop at a plan. Implement the task.
- At the end update your HANDOFF file with changed files, commands, tests and unresolved issues.
```

---

# 5. One Task Per Agent Turn

Bad:

> Build the whole Prangara platform.

Better:

> Implement Manufacturer Plant Data page against the current OpenAPI endpoints.

Better:

> Implement RFQ create/list/quote backend with migrations and tests.

Small tasks reduce merge conflicts and hallucinated architecture.

---

# 6. Required Handoff

Each owner maintains:

```text
HANDOFF_WEB.md
HANDOFF_MOBILE.md
HANDOFF_BACKEND.md
HANDOFF_DATA.md
```

Template:

```text
# Handoff

## Task completed

## Files changed

## API/schema changes

## Database migrations

## Commands run

## Tests run

## Known issues

## Dependencies on another role

## Next safe task
```

---

# 7. Contract Change Protocol

If an agent needs API/schema changes:

1. explain why
2. modify shared contract first
3. update backend
4. update frontend/generated type
5. add test
6. record breaking change

No hidden schema drift.

---

# 8. Research Prompt for Data/Compliance Agent

```text
Research only from authoritative sources where possible.
For every numeric factor, regulation, threshold or date return:
- publisher
- document/page title
- version/date
- exact URL
- unit
- jurisdiction
- applicability
- caveat
Do not fill gaps from memory.
Separate official facts from suggestions.
Do not write values into production reference data until they are reviewed.
```

---

# 9. Carbon Engine Review Prompt

Use an independent agent:

```text
Review the PRANGARA carbon engine for correctness without redesigning it.

Check:
- unit conversion
- low/base/high propagation
- Scope mapping
- stream totals
- benchmark basis
- percentile logic
- recommendation target resolution
- substitution ceilings
- blocked/capped rules
- savings-model selection
- CRF
- LCOA
- NPV
- payback edge cases
- interaction de-rating

Return only concrete issues with file/function, reasoning and a reproducible test.
Do not refactor unrelated code.
```

---

# 10. Security Review Prompt

```text
Review PRANGARA for:
- cross-tenant access
- IDOR
- broken RBAC
- unsafe file upload
- JWT mistakes
- secret exposure
- SQL injection
- unsafe CORS
- external AI leakage of private factory data
- provider access to manufacturer data
- admin-only operations exposed

Return severity, reproduction and recommended fix.
```

---

# 11. Frontend Visual Review Prompt

```text
Compare the current PRANGARA web dashboard against the approved design reference.

Check only:
- spacing
- typography
- contrast
- card hierarchy
- data density
- table quality
- responsive behavior
- chart readability
- interaction consistency

Do not change business logic, API contracts or calculation text.
```

---

# 12. RAG Review Prompt

```text
Evaluate PRANGARA RAG answers against retrieved source documents.

Fail an answer if it:
- states a regulation with no citation
- invents a threshold
- uses an expired/superseded rule without warning
- treats RAG as authoritative calculation
- says legally compliant when rule engine did not
- cites a source that does not support the claim
```

---

# 13. Bug-Fix Prompt

When an agent gets stuck, provide the exact error and use:

```text
Diagnose first.
State the root cause with evidence.
Make the smallest fix.
Run the failing command again.
Do not refactor unrelated code.
If the fix changes a shared contract, stop and document the required contract change first.
```

---

# 14. Merge Checklist

Before merging AI-generated code:

- [ ] only expected folders changed
- [ ] no unnecessary dependency churn
- [ ] no secret committed
- [ ] no mock value presented as production
- [ ] no hardcoded production backend URL
- [ ] shared API types align
- [ ] migrations included
- [ ] tests pass
- [ ] web builds
- [ ] mobile typecheck/build passes
- [ ] handoff updated
- [ ] no regulatory number added without source

---

# 15. Suggested Agent Allocation

## Codex/Astra

Best use:

- implementation
- repo-wide integration
- repetitive coding
- tests
- refactors with clear boundaries

## Claude

Best use:

- PRD/architecture understanding
- frontend design reasoning
- code review
- long-context repo analysis

## Gemini

Best use:

- independent review
- data/research assistance
- multimodal inspection
- test-case generation

Do not depend on a specific vendor/model for runtime PRANGARA functionality.

---

# 16. Context Package to Give Every New AI Account

Attach/provide:

```text
README_START_HERE.md
PRD.md
task.md
DATA_RAG_COMPLIANCE.md
relevant current source files
current HANDOFF file
```

Then state:

```text
This repository already has decisions. Do not redesign from zero.
Continue from the existing implementation and obey folder ownership.
```

---

# 17. Human Review Gates

Humans/team leader must approve:

- feature priority
- merge to main/develop
- emission factor/source approval
- compliance rule activation
- provider verification policy
- public claims
- demo scope

AI may implement these decisions but must not make them silently.

---

# 18. Final Pre-Demo Review Prompt

```text
Perform a release-candidate audit of PRANGARA.

Do not add features.
Check the complete demo path:
1. login
2. factory onboarding
3. OCR/chat extraction
4. assessment
5. Scope 1/2/3
6. leaks
7. peer benchmark
8. recommendations
9. block/cap
10. economics
11. MACC/Sankey
12. provider/RFQ
13. compliance/evidence
14. RAG citation
15. mobile/APK scan flow

Check build, runtime errors, fake data, loading states, API failures, permissions, source traceability and visual breakage.
Return issues ranked P0/P1/P2.
Do not redesign anything.
```
