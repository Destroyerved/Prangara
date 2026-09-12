"""
Leak-point detection.

"Leak point" in this problem statement is not a gas leak. It is the point in a
process where carbon is escaping the business unnecessarily - and "unnecessarily"
is only meaningful relative to what comparable plants achieve. So the detector is
benchmark-relative, not absolute.

Three detection rules, in priority order:

  1. BENCHMARK BREACH - the plant's intensity on a stream exceeds the sector p75.
     Severity scales with distance above p75. This is the honest definition of a
     leak: peers doing the same thing on the same product use less.

  2. MATERIAL CONCENTRATION - a stream is more than 15 percent of total footprint
     and sits above sector median. Large and worse-than-average is actionable even
     when it is not an outlier.

  3. STRUCTURAL HOTSPOT - a stream exceeds 25 percent of total footprint with no
     sector benchmark available (typically a purchased material). Not a failure,
     but it is where the carbon is, so it must be surfaced.

Rule 3 exists because the most common real finding for an Indian engineering SME
is that its own plant is efficient and its purchased steel is the problem. A
detector that only looked at energy intensity would report a clean bill of health
on a plant whose footprint is 70 percent Scope 3.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

from .constants import LEAK_CONTRIBUTION_PCT, MIN_STREAM_TCO2E
from .footprint import Footprint

from .paths import DATA_DIR as _DATA_DIR

# Which footprint stream each benchmarked intensity metric refers to.
_METRIC_TO_STREAM = {
    "electricity_kwh_per_t": "electricity",
    "electricity_kwh_per_lakh_rev": "electricity",
    "thermal_gj_per_t": "thermal_fuel",
    "thermal_gj_per_lakh_rev": "thermal_fuel",
}

_METRIC_LABEL = {
    "electricity_kwh_per_t": "Electricity intensity",
    "electricity_kwh_per_lakh_rev": "Electricity intensity",
    "thermal_gj_per_t": "Process heat intensity",
    "thermal_gj_per_lakh_rev": "Process heat intensity",
    "scope12_tco2e_per_t": "Operational carbon intensity (Scope 1+2)",
    "scope12_tco2e_per_cr_rev": "Operational carbon intensity (Scope 1+2)",
}

_METRIC_UNIT = {
    "electricity_kwh_per_t": "kWh/tonne",
    "electricity_kwh_per_lakh_rev": "kWh/lakh revenue",
    "thermal_gj_per_t": "GJ/tonne",
    "thermal_gj_per_lakh_rev": "GJ/lakh revenue",
    "scope12_tco2e_per_t": "tCO2e/tonne",
    "scope12_tco2e_per_cr_rev": "tCO2e/crore revenue",
}


@dataclass
class Leak:
    stream_key: str
    label: str
    rule: str
    severity: str          # critical | high | moderate | watch
    severity_score: float  # 0..1
    tco2e: float
    share_pct: float
    metric: str | None
    actual: float | None
    p50: float | None
    p75: float | None
    percentile: int | None
    gap_to_median_tco2e: float
    finding: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "stream_key": self.stream_key,
            "label": self.label,
            "rule": self.rule,
            "severity": self.severity,
            "severity_score": round(self.severity_score, 3),
            "tco2e": round(self.tco2e, 2),
            "share_pct": self.share_pct,
            "metric": self.metric,
            "metric_label": _METRIC_LABEL.get(self.metric or "", self.metric),
            "metric_unit": _METRIC_UNIT.get(self.metric or "", ""),
            "actual": round(self.actual, 2) if self.actual is not None else None,
            "p50": self.p50,
            "p75": self.p75,
            "percentile": self.percentile,
            "gap_to_median_tco2e": round(self.gap_to_median_tco2e, 2),
            "finding": self.finding,
        }


class SectorDB:
    def __init__(self, path: str | None = None):
        path = path or os.path.join(_DATA_DIR, "sectors.json")
        with open(path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
        self.meta = raw.get("meta", {})
        self.sectors: dict[str, Any] = raw["sectors"]

    def get(self, key: str) -> dict[str, Any]:
        if key not in self.sectors:
            raise KeyError(f"Unknown sector: {key}")
        return self.sectors[key]

    def list(self) -> list[dict[str, str]]:
        return [
            {"key": k, "label": v["label"], "clusters": v.get("clusters", []),
             "demo_name": v.get("demo_profile", {}).get("name", "")}
            for k, v in self.sectors.items()
        ]


_sector_db: SectorDB | None = None


def sector_db() -> SectorDB:
    global _sector_db
    if _sector_db is None:
        _sector_db = SectorDB()
    return _sector_db


def _percentile(actual: float, p25: float, p50: float, p75: float) -> int:
    """Place a value on the peer distribution by piecewise linear interpolation.

    Lower is better for every metric here, so we invert: a plant at p25 intensity
    is in the best quartile and reported as the 25th percentile of *intensity*.
    Clamped to 1..99 so the UI never claims perfection or total failure.
    """
    if actual <= p25:
        frac = actual / p25 if p25 > 0 else 0.0
        return max(1, int(25 * frac))
    if actual <= p50:
        return int(25 + 25 * (actual - p25) / (p50 - p25)) if p50 > p25 else 50
    if actual <= p75:
        return int(50 + 25 * (actual - p50) / (p75 - p50)) if p75 > p50 else 75
    over = (actual - p75) / p75 if p75 > 0 else 0.0
    return min(99, int(75 + 24 * min(1.0, over / 0.6)))


def _severity(score: float) -> str:
    if score >= 0.60:
        return "critical"
    if score >= 0.35:
        return "high"
    if score >= 0.15:
        return "moderate"
    return "watch"


def detect_leaks(fp: Footprint, sector_key: str,
                 benchmarks: dict[str, Any] | None = None,
                 provenance: dict[str, Any] | None = None) -> dict[str, Any]:
    """Run all three detection rules and return ranked leak points.

    `benchmarks` optionally overrides the sector's literature percentiles with a
    corpus-blended set (see backend/benchmarks.py). The engine itself stays
    agnostic about where the percentiles came from; `provenance` is carried
    through to the response so the UI can say which it used.
    """
    sec = sector_db().get(sector_key)
    bench = benchmarks if benchmarks is not None else sec.get("benchmarks", {})
    total = fp.total.base
    leaks: list[Leak] = []
    seen: set[str] = set()

    # ---- Rule 1: benchmark breach ------------------------------------------
    for metric, actual in fp.intensities.items():
        if metric not in bench or metric not in _METRIC_TO_STREAM:
            continue
        b = bench[metric]
        p25, p50, p75 = float(b["p25"]), float(b["p50"]), float(b["p75"])
        stream = fp.stream(_METRIC_TO_STREAM[metric])
        if stream is None or stream.t < MIN_STREAM_TCO2E:
            continue
        # A stream can be benchmarked on more than one basis (per tonne and per
        # crore of revenue). Report it once, on whichever basis the sector
        # benchmarks first, rather than raising the same finding twice.
        if stream.key in seen:
            continue

        pct = _percentile(actual, p25, p50, p75)
        if actual <= p75:
            continue

        over = (actual - p75) / p75 if p75 > 0 else 0.0
        score = min(1.0, over / 0.5)
        # A large stream that breaches matters more than a small one.
        share = 100.0 * stream.t / total if total else 0.0
        score = min(1.0, score * (0.6 + 0.4 * min(1.0, share / 30.0)) + 0.15)

        excess_ratio = (actual - p50) / actual if actual > 0 else 0.0
        gap = stream.t * max(0.0, excess_ratio)

        leaks.append(Leak(
            stream_key=stream.key, label=stream.label, rule="benchmark_breach",
            severity=_severity(score), severity_score=score,
            tco2e=stream.t, share_pct=round(share, 1),
            metric=metric, actual=actual, p50=p50, p75=p75, percentile=pct,
            gap_to_median_tco2e=gap,
            finding=(
                f"{_METRIC_LABEL.get(metric, metric)} is {actual:,.0f} against a sector "
                f"median of {p50:,.0f} and a 75th percentile of {p75:,.0f}. "
                f"This plant sits in the worst {100 - pct} percent of its peer group on this metric. "
                f"Closing the gap to median would remove about {gap:,.0f} tCO2e a year."
            ),
        ))
        seen.add(stream.key)

    # ---- Rule 2: material concentration above median ------------------------
    for metric, actual in fp.intensities.items():
        if metric not in bench or metric not in _METRIC_TO_STREAM:
            continue
        stream = fp.stream(_METRIC_TO_STREAM[metric])
        if stream is None or stream.key in seen or stream.t < MIN_STREAM_TCO2E:
            continue
        share = 100.0 * stream.t / total if total else 0.0
        b = bench[metric]
        p25, p50, p75 = float(b["p25"]), float(b["p50"]), float(b["p75"])
        if share < LEAK_CONTRIBUTION_PCT or actual <= p50:
            continue

        pct = _percentile(actual, p25, p50, p75)
        score = min(1.0, 0.12 + 0.5 * ((actual - p50) / (p75 - p50) if p75 > p50 else 0.5)
                    * min(1.0, share / 40.0) + 0.1)
        gap = stream.t * ((actual - p50) / actual if actual > 0 else 0.0)

        leaks.append(Leak(
            stream_key=stream.key, label=stream.label, rule="material_concentration",
            severity=_severity(score), severity_score=score,
            tco2e=stream.t, share_pct=round(share, 1),
            metric=metric, actual=actual, p50=p50, p75=p75, percentile=pct,
            gap_to_median_tco2e=gap,
            finding=(
                f"This stream is {share:.0f} percent of the total footprint and runs above the "
                f"sector median ({actual:,.0f} vs {p50:,.0f}). It is not an outlier, but it is "
                f"large enough that a median-level improvement is worth about {gap:,.0f} tCO2e a year."
            ),
        ))
        seen.add(stream.key)

    # ---- Rule 3: structural hotspot, no benchmark ---------------------------
    for stream in fp.streams:
        if stream.key in seen or stream.t < MIN_STREAM_TCO2E:
            continue
        share = 100.0 * stream.t / total if total else 0.0
        if share < 25.0:
            continue
        score = min(1.0, 0.20 + 0.55 * min(1.0, (share - 25.0) / 45.0))
        scope_note = (
            "This sits in Scope 3, upstream of the factory gate. It cannot be fixed by running "
            "the plant better - only by changing what is bought."
            if stream.scope == 3 else
            "This is a direct operational stream and is fully within the plant's control."
        )
        leaks.append(Leak(
            stream_key=stream.key, label=stream.label, rule="structural_hotspot",
            severity=_severity(score), severity_score=score,
            tco2e=stream.t, share_pct=round(share, 1),
            metric=None, actual=None, p50=None, p75=None, percentile=None,
            gap_to_median_tco2e=0.0,
            finding=(
                f"{stream.label} alone is {share:.0f} percent of the total footprint "
                f"({stream.t:,.0f} tCO2e). {scope_note}"
            ),
        ))

    leaks.sort(key=lambda l: (-l.severity_score, -l.tco2e))

    # Overall peer position, on the headline intensity metric available.
    peer = None
    for m in ("scope12_tco2e_per_t", "scope12_tco2e_per_cr_rev"):
        if m in fp.intensities and m in bench:
            b = bench[m]
            peer = {
                "metric": m,
                "metric_label": _METRIC_LABEL.get(m, m),
                "actual": round(fp.intensities[m], 3),
                "p25": b["p25"], "p50": b["p50"], "p75": b["p75"],
                "percentile": _percentile(fp.intensities[m], float(b["p25"]), float(b["p50"]), float(b["p75"])),
            }
            break

    total_gap = sum(l.gap_to_median_tco2e for l in leaks)
    return {
        "sector": sector_key,
        "sector_label": sec["label"],
        "energy_character": sec.get("energy_character", ""),
        "regulatory_flags": sec.get("regulatory_flags", []),
        "peer_position": peer,
        "leak_count": len(leaks),
        "critical_count": sum(1 for l in leaks if l.severity == "critical"),
        "total_gap_to_median_tco2e": round(total_gap, 1),
        "leaks": [l.as_dict() for l in leaks],
        "benchmark_caveat": sector_db().meta.get("benchmark_note", ""),
        "benchmark_provenance": provenance or {},
        "benchmark_source": (
            "blended" if provenance and any(
                v.get("source") == "blended" for v in provenance.values()
            ) else "literature"
        ),
    }
