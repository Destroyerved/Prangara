"""
Reference data: sectors, emission factors, intervention library.

Read-only and public. PRD section 3.2 requires every important number to be
traceable to a factor id, source and version, which is only possible if the
clients can fetch the registry that defines them.

The data itself is BE-2's (task.md section 5). This module only serves it and
never edits it.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.core.errors import NotFound
from app.services import provenance
from engine import default_db, intervention_db, reference_versions, sector_db

router = APIRouter(prefix="/api", tags=["reference"])


@router.get("/sectors")
def list_sectors() -> dict[str, Any]:
    return {"sectors": sector_db().list(), "meta": sector_db().meta}


@router.get("/sectors/{key}")
def get_sector(key: str) -> dict[str, Any]:
    try:
        return {"key": key, **sector_db().get(key)}
    except KeyError:
        raise NotFound(f"Unknown sector '{key}'.") from None


@router.get("/sector/{key}", include_in_schema=False)
def get_sector_singular(key: str) -> dict[str, Any]:
    """Alias for the singular spelling this endpoint had in the PS10 prototype.

    The web dashboard was built against `/api/sector/{key}` before this service
    existed. Renaming it to the plural for consistency with `/api/sectors` broke
    a client that had no way to know, so the old spelling keeps working. Hidden
    from the OpenAPI schema so new clients only learn the current name.
    """
    return get_sector(key)


@router.get("/reference")
def reference() -> dict[str, Any]:
    """The full factor registry, grouped, with source and band on every row."""
    fdb = default_db()
    groups: dict[str, list[dict[str, Any]]] = {}
    for group, entries in fdb.raw.items():
        if group == "meta":
            continue
        rows: list[dict[str, Any]] = []
        for key, spec in entries.items():
            if not isinstance(spec, dict) or "value" not in spec:
                continue
            rows.append({
                "key": key,
                "label": spec.get("label", key),
                "value": spec["value"],
                "low": spec.get("low"),
                "high": spec.get("high"),
                "unit": spec["unit"],
                "scope": spec.get("scope"),
                "source": spec.get("source"),
                "note": spec.get("note"),
                "price_inr": spec.get("typical_price_inr"),
            })
        groups[group] = rows

    active = {key: fdb.band(key).base for key in fdb.list_keys()}
    units = {key: fdb.get(key)["unit"] for key in fdb.list_keys()}

    return {
        "meta": fdb.meta,
        "groups": groups,
        "interventions_meta": intervention_db().meta,
        "intervention_count": len(intervention_db().items),
        "versions": reference_versions(),
        "provenance": provenance.coverage(active, units),
    }


@router.get("/reference/factors/{key}")
def get_factor(key: str) -> dict[str, Any]:
    """One factor with its provenance. Backs the 'where did this come from' drawer."""
    fdb = default_db()
    if not fdb.has(key):
        raise NotFound(f"Unknown emission factor '{key}'.")
    spec = dict(fdb.get(key))
    spec.pop("_group", None)
    return {
        "key": key,
        **spec,
        "denominator_unit": fdb.denominator_unit(key),
        "versions": reference_versions()["factors"],
        # PRD section 3.2: a number a user can question must point at the
        # document it came from, not just a label.
        "provenance": provenance.for_factor(
            key, fdb.band(key).base, spec.get("unit")
        ),
    }


@router.get("/reference/interventions")
def list_interventions(sector: str | None = None) -> dict[str, Any]:
    items = intervention_db().items
    if sector:
        items = [i for i in items
                 if "*" in i.get("sectors", ["*"]) or sector in i.get("sectors", [])]
    return {
        "count": len(items),
        "interventions": items,
        "meta": intervention_db().meta,
        "versions": reference_versions()["interventions"],
    }


@router.get("/reference/provenance")
def factor_provenance() -> dict[str, Any]:
    """Where every active emission factor came from, and where sources disagree.

    Backs the methodology view and the "why should I believe this number"
    question. Disagreements between the engine's registry and the verified
    source set are reported here rather than resolved silently - which value is
    right is a reference-data decision owned by BE-2, and changing one would
    change the basis of assessments factories have already been shown.
    """
    fdb = default_db()
    active = {key: fdb.band(key).base for key in fdb.list_keys()}
    units = {key: fdb.get(key)["unit"] for key in fdb.list_keys()}

    summary = provenance.coverage(active, units)
    summary["factors"] = {
        key: provenance.for_factor(key, value, units.get(key))
        for key, value in active.items()
    }
    return summary
