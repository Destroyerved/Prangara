# The Data Flywheel

The single largest limitation of the v1 engine was **L2**: sector benchmarks were literature-derived percentiles, not a measured corpus. This document describes the mechanism that retires it, and — more importantly — why the mechanism is careful rather than clever.

---

## 1. The problem

A leak point is defined relative to peers: *your electricity intensity exceeds the sector 75th percentile*. That definition is only as good as the percentile.

Our percentiles came from published sector energy-intensity literature. They are adequate to rank a plant and flag outliers, and they are **not** a surveyed corpus of Indian plants. A sophisticated customer will ask where the number came from, and "a literature range" is a weaker answer than "two hundred plants in your own cluster."

The obvious fix — replace literature with observed data — has an equally obvious failure mode: with four plants assessed, the "75th percentile" is noise wearing a statistic's clothing, and one unusual plant swings the whole sector.

---

## 2. The mechanism

Shrinkage toward the literature prior.

```
w        = n / (n + N₀)
blended  = w · empirical + (1 − w) · literature
```

`N₀ = 8`, expressed in pseudo-observations. The prior behaves as though it were worth eight real plants.

| Plants assessed | Weight on observed data |
|---|---|
| 3 | 27% |
| 6 | 43% |
| 12 | 60% |
| 24 | 75% |
| 50 | 86% |

The benchmark migrates from assumed to measured **smoothly**. There is no cliff, no version where the sector suddenly re-baselines, and no single plant that can move it far.

Below `MIN_CORPUS = 3` the literature value is returned unchanged. Percentiles computed from two plants are not percentiles.

---

## 3. The three rules that matter more than the maths

Shrinkage is standard. These are the parts that are easy to get wrong and that quietly destroy the product if you do.

### 3.1 A plant is never benchmarked against itself

```python
blended_benchmarks(sector, exclude_plant_id=plant_id)
```

If a plant's own assessment is in the corpus used to judge it, it drags its own percentile toward its own value. Do that across a sector and every plant looks average, the detector goes quiet, and the tool stops finding anything.

This is enforced in the SQL, not in a caller, so there is no path that forgets it.

### 3.2 Only the latest assessment per plant counts

A plant reassessed twelve times must not outvote eleven plants assessed once. The corpus query takes `MAX(created_at)` per `plant_id`.

Without this, the most engaged customer silently becomes the benchmark — which is precisely backwards, since the most engaged customer is usually the one improving fastest.

### 3.3 Provenance travels with the numbers

Every benchmark carries how it was derived:

```json
"electricity_kwh_per_t": {
  "source": "blended", "n": 6, "weight": 0.429,
  "literature": {"p25": 780, "p50": 1050, "p75": 1450},
  "observed":   {"p25": 812, "p50": 1104, "p75": 1487}
}
```

The UI says *"benchmarked against the live corpus"* or *"benchmarked against literature priors"*, and the leak panel names the sample size. A tool that silently upgrades its own authority as data arrives is doing something the user cannot audit.

---

## 4. Observed behaviour

Seeding a nine-plant consultancy portfolio, in order:

| # | Plant | Sector | Benchmark source |
|---|---|---|---|
| 1 | Kovai Castings | foundry | `literature` |
| 2 | Sakthi Alloys | foundry | `literature` |
| 3 | Rajkot Metalworks | foundry | `literature` |
| 4 | Belgaum Foundry Co | foundry | **`blended`** |
| 5 | Batala Iron Works | foundry | `blended` |
| 6 | Howrah Castings | foundry | `blended` |
| 7 | Tirupur Knits Dyeing | textile | `literature` |
| 8 | Surat Processors | textile | `literature` |
| 9 | Morbi Tile Works | ceramics | `literature` |

The flip happens at plant 4, not plant 3 — because plant 3 sees only two *other* plants once its own data is excluded. That off-by-one is the self-exclusion rule doing its job, and it is the cheapest possible proof that the rule is actually wired in.

Final corpus state:

| Sector | Plants | Weight | Status |
|---|---|---|---|
| Foundry / casting | 6 | 0.429 | blending in real data |
| Textile dyeing | 2 | 0.000 | literature prior |
| Ceramics | 1 | 0.000 | literature prior |

---

## 5. The second flywheel: realisation

Benchmarks are one loop. The more valuable one is **estimated versus achieved**.

Every recommendation becomes a tracked action. When someone marks it done, they can record what actually happened:

```
identified   = Σ est_abatement over all actions
committed    = Σ est_abatement where status ∈ {planned, in_progress, done}
realised     = Σ (act_abatement ?? est_abatement) where status = done

realisation_rate    = realised / identified
abatement_accuracy  = Σ act / Σ est   (only where an actual was entered)
capex_accuracy      = Σ act_capex / Σ est_capex
```

### 5.1 Why this is the most valuable data in the product

[`06-IMPACT-MODEL.md`](06-IMPACT-MODEL.md) has to **assume** a 25% realisation rate, and openly flags it as the load-bearing assumption — if it is really 10%, every impact number falls by 60%.

This measures it.

On the seeded portfolio, after one completed intervention:

| Metric | Value | Meaning |
|---|---|---|
| Realisation rate | **3.6%** | of identified abatement actually delivered |
| Abatement accuracy | **119%** | the intervention over-delivered against our estimate |
| Capex accuracy | **83%** | it cost less than we projected |
| Measured n | 1 | one data point — stated, not hidden |

One data point proves the pipeline, not the rate. But the shape of the eventual answer is now a query rather than an argument.

### 5.2 This is where machine learning finally earns its place

[`05-INNOVATION-AND-FEASIBILITY.md`](05-INNOVATION-AND-FEASIBILITY.md) §2.2 argues against ML in v1: no training data exists, and the physics is known.

The realisation table *is* the training data that did not exist. Once there are enough completed actions, `act / est` becomes a learnable target — realisation by intervention, sector, plant size and difficulty — and the engine can report *"solar typically delivers 91% of modelled abatement in this cluster"* instead of a literature range.

That is a model trained on outcomes nobody else is collecting, predicting something the physics cannot tell you: not what an intervention *could* do, but what it *does* do when a real SME installs it.

---

## 6. Why this is a moat and not a feature

Four properties, in descending order of durability:

1. **It compounds.** Every assessment improves the benchmark for every subsequent plant in that sector.
2. **It is not scrapeable.** The corpus is derived from private plant data that exists nowhere else.
3. **It is self-reinforcing through distribution.** A corporate onboarding 300 suppliers seeds an entire cluster's benchmark in one contract.
4. **It converts a stated weakness into a stated strength over time.** The limitations panel today reads *"indicative percentiles"*. With usage, the same panel reads *"blended, 240 plants"* — and that sentence is one a competitor cannot write.

---

## 7. Honest limits

| Limitation | Status |
|---|---|
| Corpus inherits any bias in who signs up | Early adopters skew toward export-exposed and better-run plants, so early percentiles likely run **optimistic** |
| No outlier rejection yet | One mis-keyed assessment shifts a small corpus; shrinkage damps it but does not remove it |
| No geographic stratification | A Morbi plant and a Khurja plant share one ceramics benchmark, though their gas prices and kiln vintages differ |
| Sector granularity is coarse | Ten sectors is too few; a jobbing foundry and a high-volume automotive foundry are not peers |
| `N₀ = 8` is a judgement call | Defensible, not derived. Worth revisiting against real variance once the corpus is large enough to measure it |

All five are visible in the product's own corpus panel or its limitations register. None is hidden behind a confident number.
