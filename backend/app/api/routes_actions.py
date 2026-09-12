"""
Carbon action tracking and measurement & verification. PRD FR-51, FR-52.

The rule this module exists to hold: expected values are never rewritten.
A factory that committed capital against a number is entitled to see that
number next to what actually happened, and a tool that quietly restates its own
forecast to match the outcome is worthless as evidence.
"""
from __future__ import annotations

from fastapi import APIRouter, Query, status
from sqlalchemy import select

from app.api.deps import ClientIp, CurrentPrincipal, DbSession
from app.core.errors import BadRequest, NotFound
from app.models.action import Action, VerificationPeriod, VerificationResult
from app.models.base import utcnow
from app.schemas.assessment import (
    ActionOut, ActionPatch, VerificationPeriodIn, VerificationPeriodOut,
    VerificationResultIn, VerificationResultOut,
)
from app.services import audit, events
from app.services.access import resolve_factory

router = APIRouter(prefix="/api", tags=["actions"])

# Which event each status transition raises.
_STATUS_EVENTS = {
    "SELECTED": events.RECOMMENDATION_SELECTED,
    "IMPLEMENTING": events.ACTION_IMPLEMENTATION_STARTED,
    "COMPLETED": events.ACTION_IMPLEMENTATION_COMPLETED,
    "VERIFIED": events.VERIFICATION_COMPLETED,
}


@router.get("/factories/{factory_id}/actions", response_model=list[ActionOut])
def list_actions(factory_id: str, principal: CurrentPrincipal, db: DbSession,
                 status_filter: str | None = Query(default=None, alias="status"),
                 ) -> list[ActionOut]:
    resolve_factory(db, principal, factory_id)
    stmt = select(Action).where(Action.factory_id == factory_id)
    if status_filter:
        stmt = stmt.where(Action.status == status_filter)
    rows = db.scalars(stmt.order_by(Action.expected_lcoa_inr_per_tco2e.asc().nulls_last())).all()
    return [ActionOut.model_validate(r) for r in rows]


@router.get("/actions/{action_id}", response_model=ActionOut)
def get_action(action_id: str, principal: CurrentPrincipal, db: DbSession) -> ActionOut:
    action = _action_or_404(db, principal, action_id)
    return ActionOut.model_validate(action)


def _action_or_404(db: DbSession, principal: CurrentPrincipal, action_id: str,
                   write: bool = False) -> Action:
    action = db.get(Action, action_id)
    if action is None:
        raise NotFound("Action not found.")
    resolve_factory(db, principal, action.factory_id, write=write)
    return action


@router.patch("/actions/{action_id}", response_model=ActionOut)
def update_action(action_id: str, body: ActionPatch, principal: CurrentPrincipal,
                  db: DbSession, ip: ClientIp) -> ActionOut:
    action = _action_or_404(db, principal, action_id, write=True)
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not patch:
        return ActionOut.model_validate(action)

    if action.was_blocked and patch.get("status") not in (None, "REJECTED"):
        # An engine block can be overridden, but only deliberately and with a
        # reason on the record. Silently reviving a blocked intervention is how
        # a tool ends up recommending something inadmissible.
        if not patch.get("notes"):
            raise BadRequest(
                "This intervention was blocked by the engine for this plant. "
                "To proceed anyway, record why in `notes`.",
                "blocked_override_needs_reason",
                {"restriction_note": action.restriction_note},
            )

    before = {k: getattr(action, k) for k in patch}
    new_status = patch.get("status")
    for key, value in patch.items():
        setattr(action, key, value)

    now = utcnow()
    if new_status == "IMPLEMENTING" and action.started_at is None:
        action.started_at = now
    if new_status == "COMPLETED" and action.completed_at is None:
        action.completed_at = now
    if new_status == "VERIFIED" and action.verified_at is None:
        action.verified_at = now

    audit.record(
        db, action="action.update", object_type="action", object_id=action.id,
        organization_id=action.organization_id, actor_user_id=principal.user_id,
        actor_label=principal.user.email, old_value=before, new_value=patch,
        reason=patch.get("rejected_reason") or patch.get("notes"), ip_address=ip,
    )
    if new_status and new_status in _STATUS_EVENTS:
        events.emit(
            db, _STATUS_EVENTS[new_status], organization_id=action.organization_id,
            factory_id=action.factory_id, actor_user_id=principal.user_id,
            correlation_id=action.id,
            payload={"action_id": action.id, "intervention_id": action.intervention_id,
                     "status": new_status, "name": action.name},
        )
    db.commit()
    return ActionOut.model_validate(action)


# --------------------------------------------------------------------------
# verification
# --------------------------------------------------------------------------

@router.post("/actions/{action_id}/verification", response_model=VerificationPeriodOut,
             status_code=status.HTTP_201_CREATED)
def open_verification(action_id: str, body: VerificationPeriodIn,
                      principal: CurrentPrincipal, db: DbSession) -> VerificationPeriodOut:
    action = _action_or_404(db, principal, action_id, write=True)
    period = VerificationPeriod(
        action_id=action.id, factory_id=action.factory_id,
        baseline_assessment_id=action.origin_assessment_id,
        period_start=body.period_start, period_end=body.period_end,
        normalisation=body.normalisation, notes=body.notes,
    )
    db.add(period)
    if action.status in ("COMPLETED",):
        action.status = "VERIFYING"
    db.commit()
    return _period_out(db, period)


@router.post("/verification/{period_id}/results", response_model=VerificationPeriodOut)
def record_results(period_id: str, body: list[VerificationResultIn],
                   principal: CurrentPrincipal, db: DbSession,
                   ip: ClientIp) -> VerificationPeriodOut:
    period = db.get(VerificationPeriod, period_id)
    if period is None:
        raise NotFound("Verification period not found.")
    factory = resolve_factory(db, principal, period.factory_id, write=True)

    for item in body:
        achievement = None
        # Achievement is measured against the *saving*, not the absolute value.
        # Comparing raw actual to raw expected reports 97 percent success on an
        # intervention that saved nothing.
        if item.baseline_value is not None and item.expected_value is not None \
                and item.actual_value is not None:
            expected_saving = item.baseline_value - item.expected_value
            actual_saving = item.baseline_value - item.actual_value
            if expected_saving != 0:
                achievement = round(100.0 * actual_saving / expected_saving, 1)
        db.add(VerificationResult(
            period_id=period.id, metric=item.metric, unit=item.unit,
            baseline_value=item.baseline_value, expected_value=item.expected_value,
            actual_value=item.actual_value, achievement_pct=achievement,
            confidence=item.confidence, assumptions=item.assumptions,
        ))

    period.status = "RECORDED"
    action = db.get(Action, period.action_id)
    db.flush()

    results = db.scalars(
        select(VerificationResult).where(VerificationResult.period_id == period.id)
    ).all()
    carbon = [r for r in results if r.metric in ("tco2e", "total_tco2e") and r.achievement_pct is not None]
    if action is not None and carbon:
        achieved = sum(r.achievement_pct for r in carbon) / len(carbon)
        if achieved < 70.0:
            events.emit(
                db, events.VERIFICATION_UNDERPERFORMED,
                organization_id=factory.organization_id, factory_id=factory.id,
                actor_user_id=principal.user_id, correlation_id=action.id,
                payload={"action_id": action.id, "period_id": period.id,
                         "achievement_pct": round(achieved, 1)},
            )
        else:
            events.emit(
                db, events.VERIFICATION_COMPLETED,
                organization_id=factory.organization_id, factory_id=factory.id,
                actor_user_id=principal.user_id, correlation_id=action.id,
                payload={"action_id": action.id, "period_id": period.id,
                         "achievement_pct": round(achieved, 1)},
            )

    audit.record(
        db, action="verification.record", object_type="verification_period",
        object_id=period.id, organization_id=factory.organization_id,
        actor_user_id=principal.user_id, actor_label=principal.user.email,
        new_value={"metrics": [r.metric for r in results]}, ip_address=ip,
    )
    db.commit()
    return _period_out(db, period)


@router.get("/actions/{action_id}/verification", response_model=list[VerificationPeriodOut])
def list_verification(action_id: str, principal: CurrentPrincipal,
                      db: DbSession) -> list[VerificationPeriodOut]:
    action = _action_or_404(db, principal, action_id)
    periods = db.scalars(
        select(VerificationPeriod).where(VerificationPeriod.action_id == action.id)
        .order_by(VerificationPeriod.period_start.desc())
    ).all()
    return [_period_out(db, p) for p in periods]


def _period_out(db: DbSession, period: VerificationPeriod) -> VerificationPeriodOut:
    results = db.scalars(
        select(VerificationResult).where(VerificationResult.period_id == period.id)
    ).all()
    out = VerificationPeriodOut.model_validate(period)
    out.results = [VerificationResultOut.model_validate(r) for r in results]
    return out
