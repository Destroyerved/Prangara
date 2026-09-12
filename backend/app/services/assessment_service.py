"""
Run the engine and persist the snapshot.

The whole of BE-1's carbon responsibility is here, and it is deliberately thin:

    PlantProfile -> engine.assess() -> AssessmentResponse -> row

Nothing in this module computes a carbon or financial number. It assembles the
engine's input, calls the engine, stamps the result with every input version,
denormalises a handful of headline figures for fast rollups, and writes one row.

Persisting the version stamp is what PRD section 30 requires and what makes the
non-negotiable test "same input + same versions = same output" checkable after
the fact rather than only in the moment.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BadRequest, UnprocessableEntity
from app.models.assessment import Assessment
from app.models.base import utcnow
from app.models.evidence import EvidenceLink
from app.models.factory import ActivityRecord, Factory, FactoryProfile
from app.services import events
from app.services.benchmarks import blended_benchmarks
from app.services.data_quality import score_profile
from app.services.profile_mapper import build_from_records
from engine import assess as run_engine
from engine import version_stamp

# A leak at or above this severity is worth waking someone up for.
_CRITICAL = "critical"


def run_assessment(db: Session, factory: Factory, profile: FactoryProfile, *,
                   actor_user_id: str | None = None, label: str | None = None,
                   scenario_id: str | None = None,
                   plant_profile_override: dict[str, Any] | None = None,
                   is_baseline: bool = True) -> Assessment:
    """Assess a factory and store the result. Caller commits."""
    records = list(
        db.scalars(select(ActivityRecord).where(ActivityRecord.profile_id == profile.id)).all()
    )
    plant_profile = plant_profile_override or build_from_records(factory, profile, records)

    if not _has_activity(plant_profile):
        raise UnprocessableEntity(
            "This factory has no activity data yet. Add at least one energy, "
            "material, waste or freight record before running an assessment.",
            "no_activity_data",
        )

    # Peer percentiles: the live cohort where one exists, literature priors
    # otherwise. The engine stays agnostic about which it was given and reports
    # the provenance back, so the UI can say which basis it judged against.
    blend = blended_benchmarks(db, factory.sector, exclude_factory_id=factory.id)

    try:
        result = run_engine(plant_profile, blend["benchmarks"], blend["provenance"])
    except KeyError as ex:
        raise BadRequest(f"Unknown reference key: {ex}", "unknown_reference_key") from ex
    except ValueError as ex:
        raise BadRequest(str(ex), "invalid_profile") from ex

    stamp = version_stamp()
    quality = score_profile(profile, records, _evidenced_record_ids(db, records))
    result["versions"] = stamp
    result["data_quality"] = quality
    result["persisted"] = True

    footprint = result["footprint"]
    intensities = footprint.get("intensities", {})
    leaks = result["leaks"]
    cash_positive = result["recommendations"]["portfolio"]["cash_positive_only"]

    assessment = Assessment(
        factory_id=factory.id,
        organization_id=factory.organization_id,
        profile_id=profile.id,
        scenario_id=scenario_id,
        created_by_user_id=actor_user_id,
        created_at=utcnow(),
        label=label,
        is_baseline=is_baseline,
        engine_profile=plant_profile,
        result=result,
        version_stamp=stamp,
        total_tco2e=footprint["total_tco2e"],
        total_low_tco2e=footprint["total_range"]["low"],
        total_high_tco2e=footprint["total_range"]["high"],
        scope1_tco2e=footprint["scope1_tco2e"],
        scope2_tco2e=footprint["scope2_tco2e"],
        scope3_tco2e=footprint["scope3_tco2e"],
        scope12_per_t=intensities.get("scope12_tco2e_per_t"),
        electricity_kwh_per_t=intensities.get("electricity_kwh_per_t"),
        thermal_gj_per_t=intensities.get("thermal_gj_per_t"),
        leak_count=leaks["leak_count"],
        critical_leak_count=leaks["critical_count"],
        cash_positive_abatement_tco2e=cash_positive["abatement_tco2e"],
        cash_positive_benefit_inr=cash_positive["net_annual_benefit_inr"],
        cash_positive_capex_inr=cash_positive["capex_inr"],
        data_quality_score=quality["score"],
    )
    db.add(assessment)
    db.flush()
    result["assessment_id"] = assessment.id
    result["factory_id"] = factory.id

    _emit_assessment_events(db, factory, assessment, result, actor_user_id)
    return assessment


def _evidenced_record_ids(db: Session, records: list[ActivityRecord]) -> set[str]:
    """Which activity records have at least one evidence document attached."""
    if not records:
        return set()
    rows = db.scalars(
        select(EvidenceLink.target_id).where(
            EvidenceLink.target_type == "activity_record",
            EvidenceLink.target_id.in_([r.id for r in records]),
        )
    ).all()
    return set(rows)


def _has_activity(plant_profile: dict[str, Any]) -> bool:
    if plant_profile.get("electricity_kwh"):
        return True
    return any(
        any(v > 0 for v in (plant_profile.get(stream) or {}).values())
        for stream in ("fuels", "materials", "waste", "freight")
    )


def _emit_assessment_events(db: Session, factory: Factory, assessment: Assessment,
                            result: dict[str, Any], actor_user_id: str | None) -> None:
    org_id = factory.organization_id
    events.emit(
        db, events.ASSESSMENT_COMPLETED, organization_id=org_id, factory_id=factory.id,
        actor_user_id=actor_user_id, correlation_id=assessment.id,
        payload={
            "assessment_id": assessment.id,
            "total_tco2e": assessment.total_tco2e,
            "scope1_tco2e": assessment.scope1_tco2e,
            "scope2_tco2e": assessment.scope2_tco2e,
            "scope3_tco2e": assessment.scope3_tco2e,
            "versions": assessment.version_stamp,
        },
    )

    for leak in result["leaks"]["leaks"]:
        if leak.get("severity") == _CRITICAL:
            events.emit(
                db, events.CRITICAL_LEAK_DETECTED, organization_id=org_id,
                factory_id=factory.id, actor_user_id=actor_user_id,
                correlation_id=assessment.id,
                payload={
                    "assessment_id": assessment.id,
                    "stream_key": leak["stream_key"],
                    "label": leak["label"],
                    "rule": leak["rule"],
                    "share_pct": leak["share_pct"],
                    "tco2e": leak["tco2e"],
                },
            )

    if (assessment.data_quality_score or 0) < 50:
        events.emit(
            db, events.DATA_QUALITY_LOW, organization_id=org_id, factory_id=factory.id,
            actor_user_id=actor_user_id, correlation_id=assessment.id,
            payload={"assessment_id": assessment.id,
                     "score": assessment.data_quality_score,
                     "gaps": result["data_quality"].get("gaps", [])},
        )

    # Compliance evaluation is BE-2's. BE-1 raises the request; if no handler is
    # registered the event stays PENDING and visible rather than disappearing.
    events.emit(
        db, events.COMPLIANCE_EVALUATION_REQUESTED, organization_id=org_id,
        factory_id=factory.id, actor_user_id=actor_user_id, correlation_id=assessment.id,
        payload={"assessment_id": assessment.id, "sector": factory.sector,
                 "eu_export_share_pct": assessment.engine_profile.get("eu_export_share_pct", 0)},
    )

    previous = db.scalar(
        select(Assessment).where(
            Assessment.factory_id == factory.id,
            Assessment.is_baseline.is_(True),
            Assessment.id != assessment.id,
        ).order_by(Assessment.created_at.desc()).limit(1)
    )
    if previous is not None and previous.total_tco2e and assessment.total_tco2e:
        change_pct = 100.0 * (assessment.total_tco2e - previous.total_tco2e) / previous.total_tco2e
        if change_pct > 5.0:
            events.emit(
                db, events.FOOTPRINT_INCREASED, organization_id=org_id, factory_id=factory.id,
                actor_user_id=actor_user_id, correlation_id=assessment.id,
                payload={"assessment_id": assessment.id,
                         "previous_assessment_id": previous.id,
                         "change_pct": round(change_pct, 1)},
            )
