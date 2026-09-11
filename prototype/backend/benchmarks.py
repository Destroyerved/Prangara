"""
Live benchmark corpus - the data flywheel, made real.

The single largest stated limitation of the v1 engine (L2 in the methodology)
is that sector benchmarks are literature-derived percentiles rather than a
measured corpus. This module closes that gap as usage accumulates, without
ever pretending to more evidence than exists.

Method: shrinkage toward the literature prior.

    w        = n / (n + N0)
    blended  = w * empirical + (1 - w) * literature

N0 is the prior strength expressed in pseudo-observations. With N0 = 8, one
real plant moves the benchmark by 11%; twenty-four real plants move it by 75%.
The benchmark therefore migrates from literature to measured smoothly, and a
single unusual plant can never swing a sector.

Two rules that matter more than the maths:

  * A plant is NEVER benchmarked against itself. Its own assessments are
    excluded from the corpus used to judge it, otherwise every plant drags its
    own percentile toward its own value and the detector goes quiet.

  * Only the LATEST assessment per plant counts. A plant reassessed twelve
    times must not outvote eleven plants assessed once.

Provenance is always returned alongside the numbers, so the UI can say
"literature prior" or "blended, 23 plants" rather than implying authority it
has not earned.
"""
from __future__ import annotations

from typing import Any

import db
from engine.leaks import sector_db

# Prior strength, in pseudo-observations. Chosen so a pilot cluster of ~25
# plants meaningfully owns its own benchmark while a handful cannot.
PRIOR_STRENGTH = 8.0

# Below this, report the literature value unchanged. Percentiles computed from
# two plants are noise wearing a statistic's clothing.
MIN_CORPUS = 3

# Benchmark metric -> denormalised assessment column
METRIC_COLUMN = {
    "scope12_tco2e_per_t": "scope12_per_t",
    "electricity_kwh_per_t": "elec_per_t",
    "thermal_gj_per_t": "thermal_per_t",
}


def _percentile(sorted_vals: list[float], p: float) -> float:
    """Linear-interpolation percentile. p in [0,1]."""
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    idx = p * (len(sorted_vals) - 1)
    lo = int(idx)
    hi = min(lo + 1, len(sorted_vals) - 1)
    frac = idx - lo
    return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac


def _corpus_values(sector: str, column: str, exclude_plant_id: str | None) -> list[float]:
    """Latest assessment per plant in this sector, one value each."""
    rows = db.query(
        f"""
        SELECT a.{column} AS v
        FROM assessments a
        JOIN plants p ON p.id = a.plant_id
        JOIN (
            SELECT plant_id, MAX(created_at) AS mx
            FROM assessments GROUP BY plant_id
        ) latest ON latest.plant_id = a.plant_id AND latest.mx = a.created_at
        WHERE p.sector = ?
          AND p.archived_at IS NULL
          AND a.{column} IS NOT NULL
          AND a.{column} > 0
          AND (? IS NULL OR a.plant_id != ?)
        """,
        (sector, exclude_plant_id, exclude_plant_id),
    )
    return sorted(float(r["v"]) for r in rows)


def blended_benchmarks(sector: str, exclude_plant_id: str | None = None) -> dict[str, Any]:
    """Return the benchmark set to use for this plant, with provenance."""
    try:
        lit = sector_db().get(sector).get("benchmarks", {})
    except KeyError:
        return {"benchmarks": {}, "provenance": {}}

    out: dict[str, Any] = {}
    prov: dict[str, Any] = {}

    for metric, lit_band in lit.items():
        # Metrics without a corpus column (water, yield, scrap rate) pass through.
        col = METRIC_COLUMN.get(metric)
        if not col or not isinstance(lit_band, dict) or "p50" not in lit_band:
            out[metric] = lit_band
            continue

        vals = _corpus_values(sector, col, exclude_plant_id)
        n = len(vals)
        lp25, lp50, lp75 = float(lit_band["p25"]), float(lit_band["p50"]), float(lit_band["p75"])

        if n < MIN_CORPUS:
            out[metric] = {"p25": lp25, "p50": lp50, "p75": lp75}
            prov[metric] = {"source": "literature", "n": n, "weight": 0.0,
                            "literature": {"p25": lp25, "p50": lp50, "p75": lp75}}
            continue

        e25, e50, e75 = (_percentile(vals, 0.25), _percentile(vals, 0.50), _percentile(vals, 0.75))
        w = n / (n + PRIOR_STRENGTH)
        b25 = w * e25 + (1 - w) * lp25
        b50 = w * e50 + (1 - w) * lp50
        b75 = w * e75 + (1 - w) * lp75

        # Percentiles must stay ordered even if a tiny corpus is degenerate.
        b25, b50, b75 = sorted([b25, b50, b75])

        out[metric] = {"p25": round(b25, 4), "p50": round(b50, 4), "p75": round(b75, 4)}
        prov[metric] = {
            "source": "blended", "n": n, "weight": round(w, 3),
            "literature": {"p25": lp25, "p50": lp50, "p75": lp75},
            "observed": {"p25": round(e25, 4), "p50": round(e50, 4), "p75": round(e75, 4)},
        }

    return {"benchmarks": out, "provenance": prov}


def corpus_stats() -> dict[str, Any]:
    """Flywheel health: how much real evidence exists, by sector."""
    rows = db.query(
        """
        SELECT p.sector, COUNT(DISTINCT p.id) AS plants, COUNT(a.id) AS assessments
        FROM plants p LEFT JOIN assessments a ON a.plant_id = p.id
        WHERE p.archived_at IS NULL
        GROUP BY p.sector
        """
    )
    by_sector = []
    for r in rows:
        n = int(r["plants"] or 0)
        w = n / (n + PRIOR_STRENGTH) if n >= MIN_CORPUS else 0.0
        try:
            label = sector_db().get(r["sector"])["label"]
        except KeyError:
            label = r["sector"]
        by_sector.append({
            "sector": r["sector"], "label": label,
            "plants": n, "assessments": int(r["assessments"] or 0),
            "benchmark_weight": round(w, 3),
            "status": "measured" if w >= 0.6 else "blended" if w > 0 else "literature",
        })
    by_sector.sort(key=lambda x: -x["plants"])

    tot = db.one("SELECT COUNT(*) AS p FROM plants WHERE archived_at IS NULL") or {}
    tota = db.one("SELECT COUNT(*) AS a FROM assessments") or {}
    return {
        "total_plants": int(tot.get("p") or 0),
        "total_assessments": int(tota.get("a") or 0),
        "prior_strength": PRIOR_STRENGTH,
        "min_corpus": MIN_CORPUS,
        "by_sector": by_sector,
        "explainer": (
            "Sector benchmarks start as published literature percentiles and shift toward "
            "measured values as real plants are assessed, weighted n/(n+8). A plant is never "
            "benchmarked against its own data, and only each plant's latest assessment counts."
        ),
    }


def realisation_stats(org_id: str | None = None) -> dict[str, Any]:
    """Estimated vs achieved, from completed actions.

    This is the number the impact model had to assume (25%). Once real plants
    mark interventions done, it becomes measured - and it is the training
    signal any future model would actually learn from.
    """
    where = "WHERE 1=1"
    params: list[Any] = []
    if org_id:
        where += " AND p.org_id = ?"
        params.append(org_id)

    rows = db.query(
        f"""SELECT a.status, a.est_abatement_tco2e AS est, a.act_abatement_tco2e AS act,
                   a.est_annual_benefit_inr AS estb, a.act_annual_benefit_inr AS actb,
                   a.est_capex_inr AS estc, a.act_capex_inr AS actc
            FROM actions a JOIN plants p ON p.id = a.plant_id {where}""",
        tuple(params),
    )

    identified = sum(float(r["est"] or 0) for r in rows)
    committed = sum(float(r["est"] or 0) for r in rows if r["status"] in ("planned", "in_progress", "done"))
    done = [r for r in rows if r["status"] == "done"]
    realised = sum(float(r["act"] if r["act"] is not None else (r["est"] or 0)) for r in done)

    # Accuracy is only meaningful where an actual was actually recorded.
    measured = [r for r in done if r["act"] is not None and (r["est"] or 0) > 0]
    accuracy = (sum(float(r["act"]) for r in measured) / sum(float(r["est"]) for r in measured)
                if measured else None)
    capex_measured = [r for r in done if r["actc"] is not None and (r["estc"] or 0) > 0]
    capex_accuracy = (sum(float(r["actc"]) for r in capex_measured) / sum(float(r["estc"]) for r in capex_measured)
                      if capex_measured else None)

    return {
        "actions_total": len(rows),
        "actions_done": len(done),
        "identified_tco2e": round(identified, 1),
        "committed_tco2e": round(committed, 1),
        "realised_tco2e": round(realised, 1),
        "realisation_rate": round(realised / identified, 3) if identified > 0 else None,
        "abatement_accuracy": round(accuracy, 3) if accuracy is not None else None,
        "capex_accuracy": round(capex_accuracy, 3) if capex_accuracy is not None else None,
        "measured_n": len(measured),
        "note": (
            "Realisation rate is realised over identified abatement. The impact model assumes "
            "25 percent; this figure replaces that assumption with measurement as soon as real "
            "plants complete interventions. Accuracy compares recorded actuals with our estimates "
            "and is only computed where an actual was entered."
        ),
    }
