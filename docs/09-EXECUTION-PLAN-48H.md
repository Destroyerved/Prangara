# 48-Hour Execution Plan

For a four-person team. The build described in this repository is already past hour 30 — this plan is how to get here, and what to do with the rest of the clock.

---

## Principles

1. **The reference data is the product.** Code is a few hundred lines; the 30-intervention library with defensible economics is the thing a judge cannot replicate from the screen. Staff it accordingly.
2. **The engine must be right before the UI is pretty.** A beautiful chart of wrong numbers loses to an ugly chart of right ones the moment a domain judge asks a question.
3. **Nothing external at runtime.** No CDN, no API, no key. The demo must survive the venue wifi dying.
4. **Freeze at hour 42.** The last six hours are rehearsal, not features.

---

## Roles

| Role | Owns |
|---|---|
| **A — Engine** | `factors`, `footprint`, `leaks`, `macc`, `assess`. The economics are their responsibility. |
| **B — Domain data** | `emission_factors.json`, `interventions.json`, `sectors.json`. **The highest-value seat on the team.** |
| **C — Frontend** | SVG Sankey and MACC, cards, layout |
| **D — Integration, docs, pitch** | API, demo profiles, the deck, the Q&A prep, and the person who says "no" to scope creep |

---

## Hour by hour

### H0–H4 · Lock the spine
- **All:** agree the interpretation of "leak point" — *benchmark-relative*, not sensor-based. **Get this wrong and 48 hours go the wrong way.** (30 minutes, whole team, non-negotiable.)
- **A:** `Band` arithmetic and `FactorDB` with unit resolution from the unit string.
- **B:** first 15 emission factors with sources and bands. Electricity + fuels first.
- **C:** page skeleton, KPI tiles, no charts yet.
- **D:** FastAPI skeleton, `/api/health`, repo structure.

> ✅ **Gate H4:** one fuel quantity converts to tCO₂e with a band, through the API.

### H4–H12 · Inventory and first sector
- **A:** `footprint.py` — streams, scopes, biogenic memo, both intensity bases.
- **B:** finish the factor set (31); build the **first** sector with benchmarks and a realistic demo plant.
- **C:** stream table + KPI tiles bound to live API data.
- **D:** `/api/assess`, `/api/sector/{k}`, `/api/demo/{k}`.

> ✅ **Gate H12:** one real plant profile returns a full Scope 1/2/3 inventory on screen.

### H12–H20 · Leak detection
- **A:** three detection rules, percentile placement, severity scoring.
- **B:** remaining nine sectors with benchmarks and demo plants.
- **C:** leak cards with the peer-distribution strip.
- **D:** **invariant test harness** — stream sum = total; no abatement exceeds its stream; all sectors assess clean. Run it after every change from here.

> ✅ **Gate H20:** leaks fire correctly on at least three sectors, with different rules triggering.

> ⚠️ **The trap that will cost you four hours here:** mixing cradle-to-gate and gate-to-gate intensity bases between your benchmarks and your computed values. Benchmark **only** Scope 1+2. We hit this and it reported an ordinary plant as catastrophic. See [`02-RESEARCH-DOSSIER.md`](02-RESEARCH-DOSSIER.md) §4.1.

### H20–H30 · The MACC — protect this window
This is the product. Nothing else gets touched until it works.

- **A:** target resolution, savings models, CRF, LCOA, payback, NPV, **interaction de-rating**.
- **B:** all 30 interventions with abatement fractions, capex bases, savings models, ceilings, caveats, evidence.
- **C:** MACC SVG with clamped axis and clipped-bar marking.
- **D:** portfolio views (`all` / `cash_positive` / `quick_wins`).

> ✅ **Gate H30:** a MACC renders and **the economics are plausible**.

> ⚠️ **Do not skip the plausibility check.** Our first run claimed ₹10.5 Cr/yr of benefit on a ₹34 Cr plant. Three bugs: whole-stream savings on tariff-delta and fuel-switch interventions, substitution ignoring its own blend ceiling, and seven electricity interventions stacking to 99% of the meter. **If your cash-positive portfolio exceeds ~15% of revenue, you have one of these bugs.**

### H30–H38 · Trust layer
The screens that separate this from a calculator.

- **A:** `BLOCKED` and `SECTOR_CAPS` — and make sure the blocked pairs are actually *candidates*, or the refusal path silently never fires. (Ours didn't, at first.)
- **B:** caveats, confidence ratings, evidence notes on every intervention.
- **C:** "Considered and rejected" panel; expandable working on every row; methodology and limitations section.
- **D:** CBAM and BRSR panels.

> ✅ **Gate H38:** the tool visibly refuses at least two interventions with stated reasons.

### H38–H42 · Polish and freeze
- Sankey ordering (scope, then size) to stop ribbon crossing.
- Number formatting in lakh/crore — an Indian judge reading `₹46,570,000` is doing mental arithmetic instead of listening.
- Run every sector once more; confirm zero invariant violations.
- **Feature freeze at H42. No exceptions.**

### H42–H48 · Rehearse
- Full run-through **4×**, timed.
- **Once with wifi off.** If it fails, that is what you just learned.
- Pre-load the hero sector so the first click shows results.
- Assign the Q&A: A takes methodology, B takes domain, D takes market.
- Sleep if any is available. A rested presenter beats one more feature.

---

## Cut list, in order

When you fall behind — and you will — cut in this order and never out of order:

| Cut # | What goes | Why it's safe |
|---|---|---|
| 1 | Sectors 6–10 | Three well-built sectors demo as well as ten |
| 2 | Sankey | The MACC is the hero; the Sankey is support |
| 3 | CBAM/BRSR panels | Nice wedge, not the core |
| 4 | NPV | Payback and LCOA carry the argument |
| 5 | Interventions below 20 | Depth beats breadth |

**Never cut:** the MACC, the refusal layer, uncertainty bands, or the invariant tests. Those four *are* the differentiation.

---

## Standing rules

- **Commit after every green invariant run.** The test harness is the most valuable thing D builds.
- **Seed everything.** No live typing during the demo; `/api/demo/{sector}` exists for exactly this.
- **One person owns the demo laptop** and does not code on it after H42.
- **Write down every assumption as you make it.** At hour 46 you will not remember why the discount rate is 12%, and a judge will ask.
