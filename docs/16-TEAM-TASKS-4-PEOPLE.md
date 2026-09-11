# Team Task Allocation — 4 People

The full build, split four ways, with dependencies, handoffs and a definition of done per task. Written so that four people who have not worked together can start in parallel at hour zero without blocking each other.

> **The single most important line in this document:** the reference data is the product. Code is a few hundred lines anyone competent can write; assembling 30 interventions with defensible abatement fractions, capex bases, savings models and physical ceilings is what a judge cannot replicate by reading the screen. **Role B is the most valuable seat on the team, not the least.**

---

## Roles at a glance

| | Role | Owns | Best fit |
|---|---|---|---|
| **A** | Engine & economics | `factors`, `footprint`, `leaks`, `macc`, `assess` | Strongest at maths/logic; comfortable being told their numbers are wrong |
| **B** | Domain data & research | `emission_factors.json`, `interventions.json`, `sectors.json`, all citations | Patient researcher; will read a DEFRA table without complaining |
| **C** | Frontend | SVG charts, views, router, action tracker | Cares how things look; can hand-roll SVG without reaching for a library |
| **D** | Platform, integration & pitch | `db`, `auth`, `repo`, `report`, API, tests, deck, Q&A | The one who says "no" to scope creep and owns the demo laptop |

**Pairing rule:** A and B must sit together. Every number A computes comes from a file B owns, and every disagreement between them is a bug found early.

---

## Hour-by-hour, by person

### H0–H4 · Lock the spine

| | Task | Done when |
|---|---|---|
| **ALL** | 30 min, whole team: agree "leak point" means **benchmark-relative**, not sensor-based. Write it on the wall. | Everyone can state it in one sentence |
| **A** | `Band` dataclass with uncertainty arithmetic; `FactorDB` with unit resolution from the unit string | One quantity × one factor returns a banded tCO₂e |
| **B** | First 15 factors — electricity and fuels — each with `low`/`base`/`high`, `unit`, `scope`, `source` | JSON parses; every entry has a named source |
| **C** | Page skeleton, KPI tiles, CSS variables. **No charts yet.** | Static page renders with dummy numbers |
| **D** | Repo, `.gitignore`, FastAPI skeleton, `/api/health` | `curl /api/health` returns 200 |

> 🚦 **Gate H4** — one fuel quantity converts to tCO₂e with a band, through the API.

---

### H4–H12 · Inventory and first sector

| | Task | Done when |
|---|---|---|
| **A** | `footprint.py` — streams, scopes, biogenic memo, **both** intensity bases | Stream sum equals reported total |
| **B** | Finish all 31 factors + 15 state grids. Build the **first** sector: benchmarks + a realistic demo plant | One sector fully specified |
| **C** | Stream table + KPI tiles bound to live API data | Real numbers on screen |
| **D** | `/api/assess`, `/api/sector/{k}`, `/api/demo/{k}` | Frontend can fetch an assessment |

> 🚦 **Gate H12** — one real plant profile returns a full Scope 1/2/3 inventory on screen.
> ⚠️ **B's trap:** benchmark **only** gate-to-gate (Scope 1+2). Mixing cradle-to-gate and gate-to-gate reported an ordinary plant as catastrophic in our build. Cost four hours.

---

### H12–H20 · Leak detection

| | Task | Done when |
|---|---|---|
| **A** | Three detection rules, percentile placement, severity scoring, `seen` guard | Different rules fire on different sectors |
| **B** | Remaining nine sectors with benchmarks and demo plants | 10 sectors assess without error |
| **C** | Leak cards with the peer-distribution strip (p50 / p75 / you) | A breach is visually obvious |
| **D** | **Invariant test harness** — stream sum = total; no abatement exceeds its stream; all sectors clean | Runs in one command |

> 🚦 **Gate H20** — leaks fire on at least three sectors, with different rules triggering.
> **D's harness is the most valuable thing built in this block.** Run it after every change from here.

---

### H20–H30 · The MACC — protect this window

Nothing else gets touched until it works. This is the product.

| | Task | Done when |
|---|---|---|
| **A** | Target resolution, five savings models, CRF, LCOA, payback, NPV, **interaction de-rating** | Economics are plausible |
| **B** | All 30 interventions — abatement fractions, capex bases, savings models, ceilings, caveats, evidence | Every card has a source and a caveat |
| **C** | MACC SVG — clamped axis, clipped-bar marking, rotated labels | Readable from the back of a room |
| **D** | Three portfolio views; keep the harness green | `cash_positive_only` computes |

> 🚦 **Gate H30** — a MACC renders **and the economics are plausible**.
> ⚠️ **Plausibility check, do not skip.** Our first run claimed ₹10.5 Cr/yr on a ₹34 Cr plant — 31% of turnover. Three bugs: whole-stream savings applied to tariff-delta and fuel-switch interventions, substitution ignoring its own blend ceiling, and seven electricity interventions stacking to 99% of the meter. **If your cash-positive portfolio exceeds ~15% of revenue, you have one of these.**

---

### H30–H38 · Trust layer

The screens that separate this from a calculator.

| | Task | Done when |
|---|---|---|
| **A** | `BLOCKED` and `SECTOR_CAPS`. **Verify the blocked pairs are actually candidates** — ours weren't, so the refusal path silently never fired | `blocked[]` is non-empty for pharma and ceramics |
| **B** | Caveats, confidence ratings, evidence notes on all 30 | No card without a caveat |
| **C** | "Considered and rejected" panel; expandable working; methodology + limitations section | Refusals visible in one scroll |
| **D** | CBAM and BRSR panels | Exposure figure computes with a stated basis |

> 🚦 **Gate H38** — the tool visibly refuses at least two interventions with stated reasons.

---

### H38–H42 · Full stack (if the team is ahead) or polish (if not)

**Take this block only if H30 and H38 gates passed on time.** Otherwise skip straight to polish.

| | Task | Done when |
|---|---|---|
| **D** | `db.py` schema, `auth.py` bcrypt + sessions, `repo.py` **org-scoped** access | Two orgs cannot see each other's plants |
| **A** | `benchmarks.py` — shrinkage blending, self-exclusion, latest-only | 4th plant in a sector flips to `blended` |
| **C** | Router, auth forms, portfolio, plant tabs, action tracker | Full journey clicks through |
| **B** | Seed a realistic multi-plant portfolio for the demo | Corpus panel shows blending |

> 🚦 **Gate H42** — sign up, add a plant, assess, mark an action done, see the realisation rate move.

---

### H42–H45 · Polish and freeze

| | Task |
|---|---|
| **C** | Sankey ordering (scope then size); Indian number formatting (lakh/crore); `hidden` beating layout CSS |
| **A** | Re-run every sector; confirm zero invariant violations |
| **B** | Final pass on citations; make sure every number has a source |
| **D** | **FEATURE FREEZE.** Tag the commit. Build the PDF report. |

> ⚠️ An Indian judge reading `₹46,570,000` is doing mental arithmetic instead of listening. Format as `₹4.66 Cr`.

---

### H45–H48 · Rehearse

| | Task |
|---|---|
| **ALL** | Full run-through **4×**, timed to 3 minutes |
| **ALL** | **Once with wifi off.** If it fails, that is what you just learned |
| **D** | Pre-load the hero sector; owns the laptop; writes nothing after freeze |
| **A** | Owns methodology Q&A — factors, bands, de-rating, why no ML |
| **B** | Owns domain Q&A — why these interventions, where the numbers come from |
| **C** | Owns "show me that again" — can navigate anywhere in 2 clicks |
| **D** | Owns market Q&A — who pays, why not an existing tool |

---

## Parallel work streams (dependency map)

```
B: factors ──► A: footprint ──► A: leaks ──────► C: leak cards
   │                │                              │
   │                └──► A: macc ──────────────────► C: MACC svg
   │                       ▲
   └─── B: interventions ──┘

D: API skeleton ──► D: routes ──► C: everything fetches
D: invariant harness ──► runs against A's work continuously
D: db/auth/repo ──► A: benchmarks ──► C: portfolio + tracker
```

**Nobody is blocked at hour zero.** A writes `Band` against a fake factor. B writes JSON needing no code. C builds the shell with dummy data. D builds the API skeleton returning stubs.

---

## Definition of done — per role

**A (Engine)**
- [ ] Every output carries a band
- [ ] Unknown units raise, never silently convert
- [ ] Stream sum equals total, all 10 sectors
- [ ] No intervention abates more than its stream holds
- [ ] De-rated ≤ standalone, always
- [ ] Fuel switch to a dearer fuel shows a **net cost**
- [ ] Can explain LCOA at a whiteboard in 60 seconds

**B (Domain)**
- [ ] Every factor has `low`/`base`/`high` and a named source
- [ ] Every intervention has evidence, confidence and at least one caveat
- [ ] Every substitution has a physical ceiling with a stated reason
- [ ] Benchmarks are gate-to-gate only
- [ ] Ten demo plants are realistic, and at least three trigger a breach
- [ ] Can defend any single number, or say "that's a literature range, here it is"

**C (Frontend)**
- [ ] Zero external requests — works with networking disabled
- [ ] MACC readable from the back of a room
- [ ] Sankey ribbons don't cross unnecessarily
- [ ] Every recommendation expands to show its working
- [ ] Refusals visible without scrolling past the fold
- [ ] All money in lakh/crore

**D (Platform & pitch)**
- [ ] Invariant harness green, one command
- [ ] Two orgs cannot see each other's data (tested, not assumed)
- [ ] `/api/demo/{sector}` returns a full result for the stage demo
- [ ] PDF report generates
- [ ] 3-minute script written and rehearsed 4×
- [ ] Q&A assignments agreed and each person has practised theirs

---

## Cut list — in order, never out of order

When you fall behind, and you will:

| Cut | What goes | Safe because |
|---|---|---|
| 1 | Sectors 6–10 | Three well-built sectors demo as well as ten |
| 2 | Full-stack block (H38–H42) | The engine is the differentiator; accounts are not |
| 3 | Sankey | The MACC is the hero; the Sankey is support |
| 4 | CBAM / BRSR panels | A good wedge, not the core |
| 5 | NPV | Payback and LCOA carry the argument |
| 6 | Interventions below 20 | Depth beats breadth |

**Never cut:** the MACC · the refusal layer · uncertainty bands · the invariant tests. Those four *are* the differentiation.

---

## If your team is 3, or 2

**Three people** — merge C and D. One person owns frontend + API + pitch. Drop the full-stack block entirely; ship the stateless engine. This is a perfectly good submission.

**Two people** — A+B as one (engine and data), C+D as one (everything else). Cut to three sectors and 20 interventions. Keep the MACC and the refusals; they are the whole argument.

---

## Standing rules

1. **Commit after every green invariant run.** Not at the end of a block.
2. **Seed everything.** No live typing during the demo — `/api/demo/{sector}` exists for exactly this.
3. **One person owns the demo laptop** and stops coding on it at freeze.
4. **Write down every assumption as you make it.** At hour 46 nobody will remember why the discount rate is 12%, and a judge will ask.
5. **When A and B disagree about a number, B wins on the source and A wins on the maths.** Resolve it in the JSON, not in a code comment.
6. **Anyone may call a plausibility check at any time.** "That number looks too good" is always a legitimate interrupt.
