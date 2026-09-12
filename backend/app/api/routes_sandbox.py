"""
Anonymous sandbox, preserved from the PS10 prototype.

Stateless. Nothing is stored, no account is required. A factory owner can see
their own footprint before deciding whether to trust us with an account, and the
public demo keeps working with no database rows at all.

Identical engine to the signed-in product. The only thing the signed-in path
adds is persistence and the live benchmark corpus.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.errors import BadRequest, NotFound
from app.schemas.factory import PlantProfileIn
from engine import assess, sector_db, version_stamp

router = APIRouter(prefix="/api", tags=["sandbox"])

_CLAIM_BOUNDARY = (
    "Screening-grade assessment. PRANGARA is decision support, not a "
    "BEE-accredited audit, legal assurance service, carbon-credit verification "
    "or a substitute for a site engineering study or vendor quotation."
)


@router.post("/assess")
def sandbox_assess(profile: PlantProfileIn) -> Any:
    try:
        result = assess(profile.model_dump())
    except KeyError as ex:
        raise BadRequest(f"Unknown reference key: {ex}", "unknown_reference_key") from ex
    except ValueError as ex:
        raise BadRequest(str(ex), "invalid_profile") from ex
    result["versions"] = version_stamp()
    result["persisted"] = False
    result["claim_boundary"] = _CLAIM_BOUNDARY
    return JSONResponse(result)


@router.get("/demo/{sector_key}")
def demo(sector_key: str) -> Any:
    """A fully worked example per sector, used by the public demo and by tests."""
    try:
        sector = sector_db().get(sector_key)
    except KeyError:
        raise NotFound(f"Unknown sector '{sector_key}'.") from None

    profile = dict(sector["demo_profile"])
    profile["sector"] = sector_key
    profile.setdefault("eu_export_share_pct", 25)
    result = assess(profile)
    result["versions"] = version_stamp()
    result["persisted"] = False
    result["is_demo"] = True
    result["claim_boundary"] = _CLAIM_BOUNDARY
    return JSONResponse(result)
