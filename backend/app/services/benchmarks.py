"""
Live benchmark corpus. PRD FR-19.

Ported from the PS10 prototype (`prototype/backend/benchmarks.py`) onto the
platform schema. The method is unchanged: shrinkage toward the literature prior.

    w       = n / (n + N0)
    blended = w * empirical + (1 - w) * literature

N0 is the prior strength in pseudo-observations. With N0 = 8, one real factory
moves a benchmark by 11 percent and twenty-four move it by 75 percent, so a
sector migrates from literature to measured smoothly and one unusual plant can
never swing it.

Three rules that matter more than the arithmetic:

  * A factory is never benchmarked against itself. Its own assessments are
    excluded from the cohort used to judge it, or every plant drags its own
    percentile toward its own value and the leak detector goes quiet.
  * Only the latest assessment per factory counts. A factory reassessed twelve
    times must not outvote eleven factories assessed once.
  * Below `MIN_COHORT` the literature value is returned unchanged. This is both
    a statistics rule and the privacy rule from FR-19: percentiles over two
    plants describe those two plants.

Provenance travels with the numbers so the UI can say "literature prior" or
"blended, 23 factories" rather than implying authority it has not earned.
"""
from __future__ import annotations

import os
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.factory import Factory
from engine import sector_db

PRIOR_STRENGTH = 8.0
MIN_COHORT = int(os.environ.get("BENCHMARK_MIN_COHORT", "3"))

# Benchmark metric -> denormalised Assessment column.
_METRIC_COLUMN = {
    "scope12_tco2e_per_t": Assessment.scope12_per_t,
    "electricity_kwh_per_t": Assessment.electricity_kwh_per_t,
    "thermal_gj_per_t": Assessment.thermal_gj_per_t,
}


def _percentile(sorted_values: list[float], p: float) -> float:
    """Linear-interpolation percentile, p in [0, 1]."""
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    idx = p * (len(sorted_values) - 1)
    lo = int(idx)
    hi = min(lo + 1, len(sorted_values) - 1)
    frac = idx - lo
    return sorted_values[lo] * (1 - frac) + sorted_values[hi] * frac


def _cohort_values(db: Session, sector: str, column, exclude_factory_id: str | None) -> list[float]:
    """One value per factory in the sector, from its most recent baseline."""
    latest = (
        select(
            Assessment.factory_id.label("factory_id"),
            func.max(Assessment.created_at).label("mx"),
        )
        .where(Assessment.is_baseline.is_(True))
        .group_by(Assessment.factory_id)
        .subquery()
    )
    stmt = (
        select(column)
        .select_from(Assessment)
        .join(Factory, Factory.id == Assessment.factory_id)
        .join(
            latest,
            (latest.c.factory_id == Assessment.factory_id)
            & (latest.c.mx == Assessment.created_at),
        )
        .where(
            Factory.sector == sector,
            Factory.archived_at.is_(None),
            column.is_not(None),
            column > 0,
        )
    )
    if exclude_factory_id:
        stmt = stmt.where(Assessment.factory_id != exclude_factory_id)
    return sorted(float(v) for v in db.scalars(stmt).all() if v)


def blended_benchmarks(db: Session, sector: str,
                       exclude_factory_id: str | None = None) -> dict[str, Any]:
    """The benchmark set to judge this factory against, plus provenance."""
    try:
        literature = sector_db().get(sector).get("benchmarks", {})
    except KeyError:
        return {"benchmarks": {}, "provenance": {}}

    benchmarks: dict[str, Any] = {}
    provenance: dict[str, Any] = {}

    for metric, band in literature.items():
        column = _METRIC_COLUMN.get(metric)
        if column is None or not isinstance(band, dict) or "p50" not in band:
            # Metrics with no corpus column (water, yield, scrap) pass through.
            benchmarks[metric] = band
            continue

        lp25, lp50, lp75 = float(band["p25"]), float(band["p50"]), float(band["p75"])
        values = _cohort_values(db, sector, column, exclude_factory_id)
        n = len(values)

        if n < MIN_COHORT:
            benchmarks[metric] = {"p25": lp25, "p50": lp50, "p75": lp75}
            provenance[metric] = {
                "source": "literature", "n": n, "weight": 0.0,
                "min_cohort": MIN_COHORT,
                "literature": {"p25": lp25, "p50": lp50, "p75": lp75},
            }
            continue

        e25 = _percentile(values, 0.25)
        e50 = _percentile(values, 0.50)
        e75 = _percentile(values, 0.75)
        w = n / (n + PRIOR_STRENGTH)
        blended = sorted([
            w * e25 + (1 - w) * lp25,
            w * e50 + (1 - w) * lp50,
            w * e75 + (1 - w) * lp75,
        ])
        benchmarks[metric] = {
            "p25": round(blended[0], 4), "p50": round(blended[1], 4), "p75": round(blended[2], 4),
        }
        provenance[metric] = {
            "source": "blended", "n": n, "weight": round(w, 3),
            "min_cohort": MIN_COHORT,
            "literature": {"p25": lp25, "p50": lp50, "p75": lp75},
            "observed": {"p25": round(e25, 4), "p50": round(e50, 4), "p75": round(e75, 4)},
        }

    return {"benchmarks": benchmarks, "provenance": provenance}


def corpus_stats(db: Session) -> dict[str, Any]:
    """How much measured evidence exists, by sector. Feeds the flywheel panel."""
    rows = db.execute(
        select(
            Factory.sector,
            func.count(func.distinct(Factory.id)).label("factories"),
            func.count(Assessment.id).label("assessments"),
        )
        .select_from(Factory)
        .outerjoin(Assessment, Assessment.factory_id == Factory.id)
        .where(Factory.archived_at.is_(None))
        .group_by(Factory.sector)
    ).all()

    by_sector = []
    for sector, factories, assessments in rows:
        n = int(factories or 0)
        weight = n / (n + PRIOR_STRENGTH) if n >= MIN_COHORT else 0.0
        try:
            label = sector_db().get(sector)["label"]
        except KeyError:
            label = sector
        by_sector.append({
            "sector": sector, "label": label,
            "factories": n, "assessments": int(assessments or 0),
            "benchmark_weight": round(weight, 3),
            "status": "measured" if weight >= 0.6 else "blended" if weight > 0 else "literature",
        })
    by_sector.sort(key=lambda row: -row["factories"])

    return {
        "total_factories": sum(r["factories"] for r in by_sector),
        "total_assessments": sum(r["assessments"] for r in by_sector),
        "prior_strength": PRIOR_STRENGTH,
        "min_cohort": MIN_COHORT,
        "by_sector": by_sector,
        "explainer": (
            "Sector benchmarks start as published literature percentiles and shift toward "
            "measured values as real factories are assessed, weighted n/(n+8). A factory is "
            "never benchmarked against its own data, only each factory's latest assessment "
            f"counts, and no cohort under {MIN_COHORT} factories is reported at all."
        ),
    }
