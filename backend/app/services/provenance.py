"""
Factor provenance: joining the engine's active factors to BE-2's verified sources.

PRD section 3.2 requires every important number to point at a factor id, a
source, a version and a date. The engine's own reference files carry a short
`source` string; BE-2's `datasets/` carries the real thing — publisher, document,
version, URL, retrieval date and a SHA-256 of the downloaded artefact. This
module joins the two.

**It changes no computed number.** The engine keeps using
`backend/data/reference/`, which is what its 85 invariant tests pin and what
every stored assessment was computed against. This only attaches citations to
those values, and reports where the two sets disagree.

Disagreements are surfaced, not resolved. Which value is correct is BE-2's call
(task.md section 5), and silently adopting either one would change the basis of
results a factory has already been shown. A visible discrepancy is a decision
waiting to be made; a silent one is a bug nobody finds.

`datasets/` belongs to BE-2 and may legitimately be absent — a checkout without
it must still serve assessments. Everything here degrades to "no provenance on
file" rather than failing.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any

_HERE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_REPO_ROOT = os.path.dirname(_HERE)

DATASETS_DIR = os.environ.get("PRANGARA_DATASETS_DIR") or os.path.join(_REPO_ROOT, "datasets")

_VERIFIED_FACTORS = os.path.join(
    DATASETS_DIR, "01_statutory_emission_baselines", "chakra_emission_factors_verified.json"
)
_SOURCE_REGISTRY = os.path.join(
    DATASETS_DIR, "06_auditing_and_proofs", "chakra_source_registry.json"
)

# Engine factor key -> verified dataset key. Written out rather than derived,
# because a fuzzy match between two independently-named registries is exactly
# how a diesel factor ends up cited against a coal source.
KEY_MAP: dict[str, str] = {
    "IN_GRID_NATIONAL": "grid_india",
    "DIESEL": "fuel_diesel",
    "NATURAL_GAS": "fuel_natural_gas",
    "LPG": "fuel_lpg",
    "FURNACE_OIL": "fuel_furnace_oil",
    "COAL_INDIAN": "fuel_indian_coal",
    "BIOMASS_BRIQUETTE": "fuel_biomass_briquette",
    "ALU_PRIMARY": "mat_aluminium_primary",
    "ALU_SECONDARY": "mat_aluminium_secondary",
    "STEEL_PRIMARY": "mat_steel_primary",
    "STEEL_SECONDARY": "mat_steel_secondary",
    "COTTON_CONV": "mat_cotton_yarn_primary",
    "COTTON_RECYCLED": "mat_cotton_yarn_recycled",
    "PET_VIRGIN": "mat_pet_virgin",
    "PET_RECYCLED": "mat_pet_recycled",
    "CEMENT_OPC": "mat_cement_opc",
    "CEMENT_BLENDED": "mat_cement_blended",
    "PAPER_VIRGIN": "mat_paper_virgin",
    "PAPER_RECYCLED": "mat_paper_recycled",
    "GLASS_VIRGIN": "mat_glass_virgin",
    "GLASS_CULLET": "mat_glass_recycled",
    "ROAD_FREIGHT_HCV": "freight_road",
    "RAIL_FREIGHT": "freight_rail",
    "LANDFILL_ORGANIC": "waste_landfill_organic",
    "ANAEROBIC_DIGEST": "waste_anaerobic_digestion",
}

# Above this relative difference the two registries are reporting materially
# different physics, not rounding. Coal at 1.70 against 1.504 is a 12 percent
# gap on a stream that dominates Scope 1 for a foundry - that is a decision,
# not a tolerance.
MATERIAL_DIFFERENCE = 0.05


def _load(path: str) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError):
        return None


@lru_cache(maxsize=1)
def _verified() -> dict[str, dict[str, Any]]:
    raw = _load(_VERIFIED_FACTORS)
    if not isinstance(raw, dict):
        return {}
    factors = raw.get("factors")
    return factors if isinstance(factors, dict) else {}


@lru_cache(maxsize=1)
def _sources() -> dict[str, dict[str, Any]]:
    raw = _load(_SOURCE_REGISTRY)
    if not isinstance(raw, list):
        return {}
    return {item["source_id"]: item for item in raw if isinstance(item, dict)
            and item.get("source_id")}


def available() -> bool:
    """Whether BE-2's verified dataset is present in this checkout."""
    return bool(_verified())


def source_for(source_id: str | None) -> dict[str, Any] | None:
    """The registry entry behind a source id, in the shape the API returns."""
    if not source_id:
        return None
    record = _sources().get(source_id)
    if record is None:
        return None
    return {
        "source_id": record.get("source_id"),
        "publisher": record.get("agency"),
        "title": record.get("dataset"),
        "version": record.get("version"),
        "url": record.get("source_url"),
        "jurisdiction": record.get("jurisdiction"),
        "authority_class": record.get("authority_class"),
        "reporting_period": record.get("reporting_period"),
        "retrieved_at": record.get("retrieved_at"),
        "artefact_sha256": record.get("sha256"),
        "notes": record.get("notes"),
    }


def for_factor(engine_key: str, engine_value: float | None = None,
               engine_unit: str | None = None) -> dict[str, Any]:
    """Provenance for one engine factor key.

    `engine_value` is the value the engine actually uses. When supplied, the
    result says whether the verified registry agrees with it and by how much.
    """
    verified_key = KEY_MAP.get(engine_key)
    if not verified_key:
        return {
            "status": "unmapped",
            "note": (
                "This factor has no counterpart in the verified dataset yet. Its "
                "source is whatever the engine reference file records."
            ),
        }

    record = _verified().get(verified_key)
    if record is None:
        return {
            "status": "unavailable",
            "note": (
                "The verified dataset is not present in this checkout, so only the "
                "engine reference file's own source string applies."
            ),
        }

    result: dict[str, Any] = {
        "status": "verified",
        "verified_key": verified_key,
        "display_name": record.get("display_name"),
        "verified_value": record.get("value"),
        "verified_low": record.get("low"),
        "verified_high": record.get("high"),
        "unit": record.get("unit"),
        "gas_basis": record.get("gas_basis"),
        "boundary": record.get("boundary"),
        "geography": record.get("geography"),
        "data_year": record.get("data_year"),
        "confidence": record.get("confidence"),
        "verification_status": record.get("verification_status"),
        "proxy_for_india": record.get("proxy_for_india"),
        "conversion_applied": record.get("conversion_applied"),
        "conversion_formula": record.get("conversion_formula"),
        "source_record": record.get("source_record"),
        "source": source_for(record.get("source_id")),
    }

    if engine_value is not None:
        verified_value = record.get("value")
        try:
            verified_value = float(verified_value)
        except (TypeError, ValueError):
            verified_value = None
        if verified_value is not None and engine_value:
            difference = (verified_value - engine_value) / abs(engine_value)
            result["engine_value"] = engine_value
            result["difference_pct"] = round(100 * difference, 2)
            result["agrees"] = abs(difference) <= MATERIAL_DIFFERENCE
            if not result["agrees"]:
                result["review_required"] = True
                result["review_note"] = (
                    f"The engine uses {engine_value:g} and the verified registry "
                    f"records {verified_value:g} ({100 * difference:+.1f} percent). "
                    "Assessments are computed with the engine value; which one is "
                    "correct is a reference-data decision, not an API decision, so "
                    "the difference is reported rather than silently resolved."
                )

    if engine_unit and record.get("unit"):
        result["unit_matches"] = _same_unit(engine_unit, record["unit"])

    return result


def _same_unit(a: str, b: str) -> bool:
    """Compare units across two registries that spell tonnes differently."""
    def norm(unit: str) -> str:
        return (
            unit.lower()
            .replace(" ", "")
            .replace("tonne-km", "t-km")
            .replace("tonnekm", "t-km")
            .replace("/tonne", "/t")
            .replace("co2e/t-km", "co2e/tkm")
        )
    return norm(a) == norm(b)


def coverage(engine_factors: dict[str, float], units: dict[str, str] | None = None) -> dict[str, Any]:
    """Provenance coverage across the whole active registry.

    Feeds the methodology panel: how many active factors have a verified
    official source behind them, and which ones disagree.
    """
    units = units or {}
    verified = 0
    unmapped: list[str] = []
    discrepancies: list[dict[str, Any]] = []

    for key, value in engine_factors.items():
        entry = for_factor(key, value, units.get(key))
        if entry.get("status") == "verified":
            verified += 1
            if entry.get("agrees") is False:
                discrepancies.append({
                    "factor_key": key,
                    "engine_value": entry.get("engine_value"),
                    "verified_value": entry.get("verified_value"),
                    "difference_pct": entry.get("difference_pct"),
                    "source": (entry.get("source") or {}).get("title"),
                })
        elif entry.get("status") == "unmapped":
            unmapped.append(key)

    total = len(engine_factors)
    return {
        "datasets_present": available(),
        "datasets_dir": DATASETS_DIR if available() else None,
        "active_factors": total,
        "with_verified_source": verified,
        "coverage_pct": round(100 * verified / total, 1) if total else 0.0,
        "unmapped_factors": sorted(unmapped),
        "discrepancies": discrepancies,
        "material_difference_threshold_pct": round(100 * MATERIAL_DIFFERENCE, 1),
        "note": (
            "Assessments are always computed from the engine reference registry. "
            "Verified source records add citations to those values and flag where "
            "the two registries disagree; they never change a stored result."
        ),
    }
