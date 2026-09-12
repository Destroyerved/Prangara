"""
Assessment and scenario endpoints.

`POST /api/factories/{id}/assessments` is the spine of the product: it maps the
stored factory data into the engine's PlantProfile, runs the engine, persists
the result with a version stamp, and syncs the recommendation list into
trackable actions.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, Response, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select

from app.api.deps import ClientIp, CurrentPrincipal, DbSession, OptionalPrincipal
from app.core.errors import NotFound, Unauthorized
from app.models.action import Action
from app.models.assessment import Assessment, Scenario
from app.models.factory import Factory, FactoryProfile
from app.schemas.assessment import (
    AssessmentDetail, AssessmentSummary, RunAssessmentRequest, ScenarioComparison,
    ScenarioCreate, ScenarioOut,
)
from app.services import audit
from app.services.access import resolve_factory
from app.services.assessment_service import run_assessment
from app.services.benchmarks import corpus_stats
from app.services.profile_mapper import build_from_records
from app.services.report import build_report_html, render_pdf
from app.services.scenario import apply_modifications
from engine import assess, sector_db, version_stamp

router = APIRouter(prefix="/api", tags=["assessments"])


def _profile_or_404(db: DbSession, factory_id: str, profile_id: str | None) -> FactoryProfile:
    if profile_id:
        profile = db.get(FactoryProfile, profile_id)
        if profile is None or profile.factory_id != factory_id:
            raise NotFound("Reporting period not found for this factory.")
        return profile
    profile = db.scalar(
        select(FactoryProfile).where(FactoryProfile.factory_id == factory_id)
        .order_by(FactoryProfile.created_at.desc()).limit(1)
    )
    if profile is None:
        raise NotFound("This factory has no reporting period yet.")
    return profile


@router.post("/factories/{factory_id}/assessments", response_model=AssessmentDetail,
             status_code=status.HTTP_201_CREATED)
def create_assessment(factory_id: str, body: RunAssessmentRequest,
                      principal: CurrentPrincipal, db: DbSession,
                      ip: ClientIp) -> AssessmentDetail:
    factory = resolve_factory(db, principal, factory_id, write=True)
    profile = _profile_or_404(db, factory_id, body.profile_id)

    assessment = run_assessment(
        db, factory, profile, actor_user_id=principal.user_id, label=body.label,
    )
    sync_actions(db, assessment)
    audit.record(
        db, action="assessment.run", object_type="assessment", object_id=assessment.id,
        organization_id=factory.organization_id, actor_user_id=principal.user_id,
        actor_label=principal.user.email, correlation_id=assessment.id, ip_address=ip,
        new_value={"total_tco2e": assessment.total_tco2e,
                   "versions": assessment.version_stamp},
    )
    db.commit()
    return AssessmentDetail.model_validate(assessment)


@router.get("/factories/{factory_id}/assessments", response_model=list[AssessmentSummary])
def list_assessments(factory_id: str, principal: CurrentPrincipal, db: DbSession,
                     limit: int = Query(default=25, ge=1, le=100)) -> list[AssessmentSummary]:
    resolve_factory(db, principal, factory_id)
    rows = db.scalars(
        select(Assessment).where(Assessment.factory_id == factory_id)
        .order_by(Assessment.created_at.desc()).limit(limit)
    ).all()
    return [AssessmentSummary.model_validate(r) for r in rows]


@router.get("/assessments/{assessment_id}", response_model=AssessmentDetail)
def get_assessment(assessment_id: str, principal: CurrentPrincipal,
                   db: DbSession) -> AssessmentDetail:
    assessment = db.get(Assessment, assessment_id)
    if assessment is None:
        raise NotFound("Assessment not found.")
    # Authorisation goes through the factory, so a leaked assessment id is not
    # enough to read someone else's result.
    resolve_factory(db, principal, assessment.factory_id)
    return AssessmentDetail.model_validate(assessment)


@router.get("/assessments/{assessment_id}/report")
def get_assessment_report(assessment_id: str, db: DbSession,
                          principal: OptionalPrincipal = None,
                          fmt: str = Query(default="html", pattern="^(html|pdf)$")) -> Response:
    """Export the assessment as an audited working paper in HTML or PDF format."""
    is_demo = assessment_id.startswith("demo") or assessment_id.startswith("development-")
    if is_demo:
        clean_key = (
            assessment_id.replace("demo-", "")
            .replace("demo_", "")
            .replace("development-", "")
            .split("-")[0]
        )
        s_db = sector_db()
        target_sector = None
        for k in s_db.sectors:
            if k == clean_key or k == clean_key.replace("-", "_") or clean_key in k:
                target_sector = k
                break
        if not target_sector:
            target_sector = "textile_dyeing"

        sector_data = s_db.get(target_sector)
        profile_data = dict(sector_data.get("demo_profile", {}))
        profile_data["sector"] = target_sector
        profile_data.setdefault("eu_export_share_pct", 25)
        res = assess(profile_data)

        demo_assessment = Assessment(
            id=assessment_id,
            factory_id="demo-factory",
            is_baseline=True,
            total_tco2e=res["footprint"]["total_tco2e"],
            result=res,
            engine_profile=profile_data,
            version_stamp=version_stamp(),
        )
        demo_factory = Factory(
            id="demo-factory",
            name=profile_data.get(
                "name",
                f"{sector_data.get('label', target_sector.replace('_', ' ').title())} Demo Facility",
            ),
            sector=target_sector,
            state=profile_data.get("state", "Tamil Nadu"),
        )
        html_content = build_report_html(demo_assessment, demo_factory, None)
    else:
        assessment = db.get(Assessment, assessment_id)
        if assessment is None:
            raise NotFound("Assessment not found.")
        if principal is None:
            raise Unauthorized("Authentication required to access factory assessment reports.")
        factory = resolve_factory(db, principal, assessment.factory_id)
        profile = db.get(FactoryProfile, assessment.profile_id) if assessment.profile_id else None
        html_content = build_report_html(assessment, factory, profile)

    if fmt == "pdf":
        pdf_bytes = render_pdf(html_content)
        if pdf_bytes:
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="prangara-report-{assessment_id[:12]}.pdf"',
                },
            )
        # Headless browser not available; return HTML with warning header
        return HTMLResponse(
            content=html_content,
            headers={"X-Report-Fallback": "pdf_engine_unavailable"},
        )
    return HTMLResponse(content=html_content)


@router.get("/corpus")
def corpus(db: DbSession) -> dict[str, Any]:
    """Benchmark flywheel health. Aggregate only - no factory is identifiable."""
    return corpus_stats(db)


# --------------------------------------------------------------------------
# scenarios
# --------------------------------------------------------------------------

@router.post("/factories/{factory_id}/scenarios", response_model=ScenarioOut,
             status_code=status.HTTP_201_CREATED)
def create_scenario(factory_id: str, body: ScenarioCreate, principal: CurrentPrincipal,
                    db: DbSession) -> ScenarioOut:
    factory = resolve_factory(db, principal, factory_id, write=True)
    scenario = Scenario(
        factory_id=factory.id,
        organization_id=factory.organization_id,
        baseline_assessment_id=body.baseline_assessment_id,
        created_by_user_id=principal.user_id,
        name=body.name,
        description=body.description,
        modifications={"items": [m.model_dump() for m in body.modifications]},
    )
    db.add(scenario)
    db.commit()
    return ScenarioOut.model_validate(scenario)


@router.get("/factories/{factory_id}/scenarios", response_model=list[ScenarioOut])
def list_scenarios(factory_id: str, principal: CurrentPrincipal,
                   db: DbSession) -> list[ScenarioOut]:
    resolve_factory(db, principal, factory_id)
    rows = db.scalars(
        select(Scenario).where(Scenario.factory_id == factory_id,
                               Scenario.archived_at.is_(None))
        .order_by(Scenario.created_at.desc())
    ).all()
    return [ScenarioOut.model_validate(r) for r in rows]


@router.post("/scenarios/{scenario_id}/run", response_model=ScenarioComparison)
def run_scenario(scenario_id: str, principal: CurrentPrincipal,
                 db: DbSession) -> ScenarioComparison:
    """Apply the scenario's modifications and rerun the same engine.

    The baseline is untouched. The scenario produces its own assessment row with
    `is_baseline = False`, which also keeps scenario runs out of the peer
    benchmark corpus - a factory's hypothetical must not move its sector.
    """
    scenario = db.get(Scenario, scenario_id)
    if scenario is None or scenario.archived_at is not None:
        raise NotFound("Scenario not found.")
    factory = resolve_factory(db, principal, scenario.factory_id, write=True)

    baseline = None
    if scenario.baseline_assessment_id:
        baseline = db.get(Assessment, scenario.baseline_assessment_id)
    if baseline is None:
        baseline = db.scalar(
            select(Assessment).where(Assessment.factory_id == factory.id,
                                     Assessment.is_baseline.is_(True))
            .order_by(Assessment.created_at.desc()).limit(1)
        )
    if baseline is None:
        raise NotFound("Run a baseline assessment before running a scenario against it.")

    profile = db.get(FactoryProfile, baseline.profile_id) if baseline.profile_id else None
    if profile is None:
        profile = _profile_or_404(db, factory.id, None)

    modified, unsupported = apply_modifications(
        baseline.engine_profile, scenario.modifications.get("items", [])
    )
    assessment = run_assessment(
        db, factory, profile, actor_user_id=principal.user_id,
        label=f"Scenario: {scenario.name}", scenario_id=scenario.id,
        plant_profile_override=modified, is_baseline=False,
    )
    scenario.latest_assessment_id = assessment.id
    scenario.baseline_assessment_id = baseline.id
    db.commit()

    delta = None
    delta_pct = None
    if baseline.total_tco2e and assessment.total_tco2e is not None:
        delta = round(assessment.total_tco2e - baseline.total_tco2e, 2)
        delta_pct = round(100.0 * delta / baseline.total_tco2e, 2)

    return ScenarioComparison(
        scenario=ScenarioOut.model_validate(scenario),
        baseline=AssessmentSummary.model_validate(baseline),
        result=AssessmentSummary.model_validate(assessment),
        delta_tco2e=delta,
        delta_pct=delta_pct,
        unsupported=unsupported,
    )


# --------------------------------------------------------------------------
# recommendation -> action sync
# --------------------------------------------------------------------------

def sync_actions(db: DbSession, assessment: Assessment) -> int:
    """Create a PROPOSED action for each new recommendation. Caller commits.

    Existing actions are never overwritten. Once a factory has selected,
    quoted or implemented something, the numbers it committed against stay
    frozen; a fresh assessment adds new proposals, it does not restate history.
    """
    recommendations = assessment.result.get("recommendations", {})
    existing = {
        a.intervention_id: a
        for a in db.scalars(
            select(Action).where(Action.factory_id == assessment.factory_id)
        ).all()
    }
    created = 0

    for rec in recommendations.get("recommendations", []):
        if rec["id"] in existing:
            continue
        db.add(Action(
            factory_id=assessment.factory_id,
            organization_id=assessment.organization_id,
            origin_assessment_id=assessment.id,
            intervention_id=rec["id"],
            name=rec["name"],
            category=rec.get("category"),
            target_stream=rec.get("target_stream"),
            status="PROPOSED",
            expected_abatement_tco2e=rec.get("portfolio_abatement_tco2e"),
            expected_capex_inr=rec.get("capex_inr"),
            expected_annual_benefit_inr=rec.get("net_annual_benefit_inr"),
            expected_payback_yrs=rec.get("payback_yrs"),
            expected_lcoa_inr_per_tco2e=rec.get("lcoa_inr_per_tco2e"),
            was_capped=bool(rec.get("substitution_capped")),
            restriction_note=rec.get("restriction_note") or None,
            engine_snapshot={
                "abatement_range": rec.get("abatement_range"),
                "standalone_abatement_tco2e": rec.get("abatement_tco2e"),
                "difficulty": rec.get("difficulty"),
                "disruption_days": rec.get("disruption_days"),
                "confidence": rec.get("confidence"),
                "physical_note": rec.get("physical_note"),
                "savings_model": rec.get("savings_model"),
                "versions": assessment.version_stamp,
            },
        ))
        created += 1

    # Blocked interventions are recorded too. "PRANGARA said no" is a finding
    # the factory should be able to see, cite and revisit - not an absence.
    for blocked in recommendations.get("blocked", []):
        if blocked["id"] in existing:
            continue
        db.add(Action(
            factory_id=assessment.factory_id,
            organization_id=assessment.organization_id,
            origin_assessment_id=assessment.id,
            intervention_id=blocked["id"],
            name=blocked["name"],
            status="REJECTED",
            was_blocked=True,
            restriction_note=blocked.get("reason"),
            rejected_reason=blocked.get("reason"),
            engine_snapshot={"versions": assessment.version_stamp},
        ))
        created += 1

    return created
