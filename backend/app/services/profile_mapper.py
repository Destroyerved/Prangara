"""
Persisted factory data -> the engine's PlantProfile.

This is the only place the platform's relational shape is translated into the
dict `engine.assess()` consumes. It does no carbon arithmetic: it sums
quantities, converts units and hands over. Every emission number still comes out
of the engine.

Two rules enforced here:

  * Identity comes from the Factory row, never from client input. A caller
    cannot re-sector or rename a factory by posting a different profile.
  * A quantity whose unit does not match its emission factor raises rather than
    being assumed correct (see `app/services/units.py`).
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import UnprocessableEntity
from app.models.factory import (
    STREAM_ELECTRICITY, STREAM_FREIGHT, STREAM_FUEL, STREAM_MATERIAL, STREAM_WASTE,
    ActivityRecord, Factory, FactoryProfile,
)
from app.services.units import convert
from engine import default_db

# The unit the engine expects for each stream, before the factor's own
# denominator is consulted.
_ELECTRICITY_UNIT = "kWh"
_FREIGHT_UNIT = "tonne-km"


def build_plant_profile(db: Session, factory: Factory,
                        profile: FactoryProfile) -> dict[str, Any]:
    records = list(
        db.scalars(
            select(ActivityRecord).where(ActivityRecord.profile_id == profile.id)
        ).all()
    )
    return build_from_records(factory, profile, records)


def build_from_records(factory: Factory, profile: FactoryProfile,
                       records: list[ActivityRecord]) -> dict[str, Any]:
    fdb = default_db()
    electricity_kwh = 0.0
    fuels: dict[str, float] = defaultdict(float)
    materials: dict[str, float] = defaultdict(float)
    waste: dict[str, float] = defaultdict(float)
    freight: dict[str, float] = defaultdict(float)

    for record in records:
        if record.quantity <= 0:
            continue
        where = f"activity record {record.id} ({record.label or record.factor_key or record.stream_kind})"

        if record.stream_kind == STREAM_ELECTRICITY:
            electricity_kwh += convert(record.quantity, record.unit, _ELECTRICITY_UNIT, context=where)
            continue

        if not record.factor_key:
            raise UnprocessableEntity(
                f"No emission factor selected for {where}.", "missing_factor_key",
                {"activity_record_id": record.id},
            )
        if not fdb.has(record.factor_key):
            raise UnprocessableEntity(
                f"Unknown emission factor '{record.factor_key}' on {where}.",
                "unknown_factor_key", {"activity_record_id": record.id,
                                       "factor_key": record.factor_key},
            )

        target_unit = _FREIGHT_UNIT if record.stream_kind == STREAM_FREIGHT \
            else fdb.denominator_unit(record.factor_key)
        quantity = convert(record.quantity, record.unit, target_unit, context=where)

        bucket = {
            STREAM_FUEL: fuels,
            STREAM_MATERIAL: materials,
            STREAM_WASTE: waste,
            STREAM_FREIGHT: freight,
        }.get(record.stream_kind)
        if bucket is None:
            raise UnprocessableEntity(
                f"Unsupported activity stream '{record.stream_kind}' on {where}.",
                "unknown_stream_kind", {"activity_record_id": record.id},
            )
        bucket[record.factor_key] += quantity

    return {
        # Identity from the factory row, not from the caller.
        "name": factory.name,
        "sector": factory.sector,
        "state": factory.state,
        "annual_output_t": profile.annual_output_t,
        "annual_revenue_cr": profile.annual_revenue_cr,
        "employees": profile.employees,
        "electricity_kwh": electricity_kwh,
        "fuels": dict(fuels),
        "materials": dict(materials),
        "waste": dict(waste),
        "freight": dict(freight),
        "eu_export_share_pct": profile.eu_export_share_pct,
        "tariff_inr_per_kwh": profile.tariff_inr_per_kwh,
        "discount_rate": profile.discount_rate,
    }


def missing_fields(plant_profile: dict[str, Any]) -> list[str]:
    """What the profile still needs before the result is worth showing.

    Used by the mobile onboarding flow to ask the next question, and by the data
    quality score. It reports gaps; it never fills them.
    """
    gaps: list[str] = []
    if not plant_profile.get("annual_output_t") and not plant_profile.get("annual_revenue_cr"):
        gaps.append("annual_output_t")
    if not plant_profile.get("electricity_kwh"):
        gaps.append("electricity_kwh")
    if not plant_profile.get("fuels") and not plant_profile.get("electricity_kwh"):
        gaps.append("fuels")
    if not plant_profile.get("materials"):
        gaps.append("materials")
    return gaps
