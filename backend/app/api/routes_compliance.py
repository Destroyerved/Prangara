"""
Compliance case management. PRD FR-46, FR-49; task.md Phase 2 BE-1.

Ownership boundary, restated because it is the whole point of this module:
**BE-1 stores compliance verdicts and tracks who is accountable for them. BE-2
decides them.** Nothing here evaluates a rule, reads a rule pack or computes a
threshold. `POST /api/compliance/evaluate` raises an event and returns; if no
evaluator is registered the event stays visible in the outbox rather than
quietly resolving to "compliant".

The readiness view assembles three things that already exist — the engine's own
compliance panel, the evidence actually on file, and the open cases — and says
which of the three each line came from. It never adds a determination of its own.

Wording (DATA_RAG_COMPLIANCE section 34): readiness, risk, evidence gap, action
required, human review. Never compliant, certified, approved or guaranteed.
"""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select

from app.api.deps import ClientIp, CurrentPrincipal, DbSession
from app.core.errors import BadRequest, Conflict, NotFound
from app.models.assessment import Assessment
from app.models.base import utcnow
from app.models.evidence import EvidenceDocument, EvidenceLink
from app.models.governance import ComplianceCase, CorrectiveAction
from app.schemas.compliance import (
    CloseCaseRequest, ComplianceCaseCreate, ComplianceCaseOut, ComplianceCasePatch,
    ComplianceReadiness, CorrectiveActionIn, CorrectiveActionOut, CorrectiveActionPatch,
    EvaluateRequest, ReadinessItem,
)
from app.services import audit, events
from app.services.access import accessible_factory_ids, resolve_factory
from app.services.database_sync import get_db_sync

router = APIRouter(prefix="/api", tags=["compliance"])

_OPEN_STATES = ("ACTION_REQUIRED", "AT_RISK", "MISSING", "PARTIAL", "HUMAN_REVIEW_REQUIRED")

CAVEAT = (
    "Readiness and risk screening only. PRANGARA reports what evidence exists and "
    "what a versioned rule pack flagged. It does not determine legal compliance, "
    "provide assurance, or act as a regulator or verifier."
)


# --------------------------------------------------------------------------
# serialisation
# --------------------------------------------------------------------------

def _corrective_out(row: CorrectiveAction, today: dt.date) -> CorrectiveActionOut:
    out = CorrectiveActionOut.model_validate(row)
    out.is_overdue = bool(
        row.due_date and row.due_date < today and row.status not in ("DONE", "CANCELLED")
    )
    return out


def _case_out(db: DbSession, case: ComplianceCase) -> ComplianceCaseOut:
    today = dt.date.today()
    actions = db.scalars(
        select(CorrectiveAction)
        .where(CorrectiveAction.case_id == case.id)
        .order_by(CorrectiveAction.created_at)
    ).all()
    evidence_count = db.scalar(
        select(func.count())
        .select_from(EvidenceLink)
        .where(EvidenceLink.target_type == "compliance_case",
               EvidenceLink.target_id == case.id)
    ) or 0

    out = ComplianceCaseOut.model_validate(case)
    out.corrective_actions = [_corrective_out(a, today) for a in actions]
    out.evidence_count = int(evidence_count)
    out.is_overdue = bool(
        case.due_date and case.due_date < today and case.closed_at is None
    )
    return out


def _case_or_404(db: DbSession, principal: CurrentPrincipal, case_id: str,
                 write: bool = False) -> ComplianceCase:
    case = db.get(ComplianceCase, case_id)
    if case is None:
        raise NotFound("Compliance case not found.")
    # Authorisation runs through the factory, so a leaked case id is not enough
    # to read another tenant's finding.
    resolve_factory(db, principal, case.factory_id, write=write)
    return case


# --------------------------------------------------------------------------
# readiness
# --------------------------------------------------------------------------

@router.get("/factories/{factory_id}/compliance", response_model=ComplianceReadiness)
def readiness(factory_id: str, principal: CurrentPrincipal,
              db: DbSession) -> ComplianceReadiness:
    """Assemble the readiness view for one factory.

    Every line names its `basis`. A line that came from the engine's screening
    panel is labelled as such; one that came from counting documents says so.
    Nothing here decides anything new.
    """
    factory = resolve_factory(db, principal, factory_id)

    latest = db.scalar(
        select(Assessment)
        .where(Assessment.factory_id == factory.id, Assessment.is_baseline.is_(True))
        .order_by(Assessment.created_at.desc())
        .limit(1)
    )
    cases = db.scalars(
        select(ComplianceCase).where(ComplianceCase.factory_id == factory.id)
    ).all()

    today = dt.date.today()
    open_cases = [c for c in cases if c.closed_at is None]
    overdue = [c for c in open_cases if c.due_date and c.due_date < today]
    needs_review = [c for c in open_cases if c.requires_human_review]

    items: list[ReadinessItem] = []
    engine_panel: dict = {}

    if latest is None:
        items.append(ReadinessItem(
            key="assessment",
            label="Carbon inventory",
            status="MISSING",
            detail="No assessment has been run, so nothing can be reported yet.",
            basis="platform",
        ))
    else:
        engine_panel = latest.result.get("compliance", {})
        footprint = latest.result.get("footprint", {})

        for scope in (1, 2, 3):
            value = footprint.get(f"scope{scope}_tco2e") or 0.0
            items.append(ReadinessItem(
                key=f"scope{scope}",
                label=f"Scope {scope} inventory",
                status="READY" if value > 0 else "MISSING",
                detail=f"{value:,.1f} tCO2e reported"
                if value > 0 else "No activity data in this scope.",
                basis="deterministic engine",
            ))

        quality = latest.result.get("data_quality", {})
        score = quality.get("score")
        if score is not None:
            items.append(ReadinessItem(
                key="data_quality",
                label="Data quality",
                status="READY" if score >= 60 else "AT_RISK",
                detail=f"{score:.0f}/100 ({quality.get('band', 'unknown')}). "
                       + (f"Gaps: {', '.join(quality.get('gaps', [])[:4])}."
                          if quality.get("gaps") else "No gaps recorded."),
                basis="data quality scorer",
            ))

        cbam = engine_panel.get("cbam") or {}
        if cbam.get("applicable"):
            items.append(ReadinessItem(
                key="cbam",
                label="EU CBAM exposure",
                status="ACTION_REQUIRED" if cbam.get("eu_export_share_pct") else "PARTIAL",
                detail=cbam.get("caveat"),
                basis="deterministic engine (indicative screening)",
            ))

    evidence_total = db.scalar(
        select(func.count())
        .select_from(EvidenceDocument)
        .where(EvidenceDocument.factory_id == factory.id,
               EvidenceDocument.deleted_at.is_(None))
    ) or 0
    reviewed = db.scalar(
        select(func.count())
        .select_from(EvidenceDocument)
        .where(EvidenceDocument.factory_id == factory.id,
               EvidenceDocument.deleted_at.is_(None),
               EvidenceDocument.verification_status == "reviewed")
    ) or 0
    items.append(ReadinessItem(
        key="evidence",
        label="Supporting evidence",
        status="READY" if reviewed > 0 else ("PARTIAL" if evidence_total else "MISSING"),
        detail=f"{evidence_total} document(s) on file, {reviewed} reviewed by a person.",
        basis="evidence vault",
    ))

    # Cases attach to whichever readiness line their rule pack names, when the
    # key matches; otherwise they are counted in the totals only.
    by_key: dict[str, int] = {}
    for case in open_cases:
        by_key[case.rule_pack.lower()] = by_key.get(case.rule_pack.lower(), 0) + 1
    for item in items:
        item.open_case_count = by_key.get(item.key, 0)

    if overdue or any(c.severity in ("high", "critical") for c in open_cases):
        overall = "ACTION_REQUIRED"
    elif needs_review:
        overall = "HUMAN_REVIEW_REQUIRED"
    elif open_cases:
        overall = "AT_RISK"
    elif any(i.status == "MISSING" for i in items):
        overall = "PARTIAL"
    else:
        overall = "READY"

    return ComplianceReadiness(
        factory_id=factory.id,
        assessment_id=latest.id if latest else None,
        evaluated_at=latest.created_at if latest else None,
        overall=overall,
        items=items,
        open_cases=len(open_cases),
        overdue_cases=len(overdue),
        human_review_required=len(needs_review),
        engine_panel=engine_panel,
        rule_packs_evaluated=sorted({c.rule_pack for c in cases}),
        caveat=CAVEAT,
    )


@router.post("/compliance/evaluate", status_code=status.HTTP_202_ACCEPTED)
def request_evaluation(body: EvaluateRequest, principal: CurrentPrincipal,
                       db: DbSession) -> dict[str, str]:
    """Ask for a compliance evaluation.

    202, not 200: BE-1 raises the request and the evaluator (BE-2) answers it.
    Returning a verdict from here would mean inventing one.
    """
    factory = resolve_factory(db, principal, body.factory_id, write=True)

    assessment_id = body.assessment_id
    if assessment_id:
        assessment = db.get(Assessment, assessment_id)
        if assessment is None or assessment.factory_id != factory.id:
            raise NotFound("Assessment not found for this factory.")
    else:
        latest = db.scalar(
            select(Assessment)
            .where(Assessment.factory_id == factory.id, Assessment.is_baseline.is_(True))
            .order_by(Assessment.created_at.desc()).limit(1)
        )
        if latest is None:
            raise BadRequest(
                "Run an assessment before requesting a compliance evaluation.",
                "no_assessment",
            )
        assessment_id = latest.id

    event = events.emit(
        db, events.COMPLIANCE_EVALUATION_REQUESTED,
        organization_id=factory.organization_id, factory_id=factory.id,
        actor_user_id=principal.user_id, correlation_id=assessment_id,
        payload={"assessment_id": assessment_id, "sector": factory.sector,
                 "requested_by": principal.user_id},
    )
    db.commit()
    return {
        "status": "queued",
        "event_id": event.id,
        "assessment_id": assessment_id,
        "note": "Queued for the compliance evaluator. Poll the cases endpoint for results.",
    }


# --------------------------------------------------------------------------
# cases
# --------------------------------------------------------------------------

@router.get("/compliance/cases", response_model=list[ComplianceCaseOut])
def list_cases(principal: CurrentPrincipal, db: DbSession,
               factory_id: str | None = None,
               case_status: str | None = Query(default=None, alias="status"),
               open_only: bool = False,
               limit: int = Query(default=50, ge=1, le=200)) -> list[ComplianceCaseOut]:
    stmt = select(ComplianceCase)
    if factory_id:
        resolve_factory(db, principal, factory_id)
        stmt = stmt.where(ComplianceCase.factory_id == factory_id)
    else:
        ids = accessible_factory_ids(db, principal)
        if ids is not None:
            if not ids:
                return []
            stmt = stmt.where(ComplianceCase.factory_id.in_(ids))
    if case_status:
        stmt = stmt.where(ComplianceCase.status == case_status)
    if open_only:
        stmt = stmt.where(ComplianceCase.closed_at.is_(None))

    rows = db.scalars(stmt.order_by(ComplianceCase.created_at.desc()).limit(limit)).all()
    return [_case_out(db, row) for row in rows]


@router.post("/compliance/cases", response_model=ComplianceCaseOut,
             status_code=status.HTTP_201_CREATED)
def create_case(body: ComplianceCaseCreate, principal: CurrentPrincipal,
                db: DbSession, ip: ClientIp) -> ComplianceCaseOut:
    factory = resolve_factory(db, principal, body.factory_id, write=True)

    if body.assessment_id:
        assessment = db.get(Assessment, body.assessment_id)
        if assessment is None or assessment.factory_id != factory.id:
            raise NotFound("Assessment not found for this factory.")

    case = ComplianceCase(
        organization_id=factory.organization_id,
        **body.model_dump(),
    )
    db.add(case)
    db.flush()

    audit.record(
        db, action="compliance.case.create", object_type="compliance_case",
        object_id=case.id, organization_id=factory.organization_id,
        actor_user_id=principal.user_id, actor_label=principal.user.email,
        ip_address=ip, correlation_id=case.assessment_id,
        new_value={"rule_id": case.rule_id, "rule_pack": case.rule_pack,
                   "rule_pack_version": case.rule_pack_version,
                   "severity": case.severity, "status": case.status},
    )
    events.emit(
        db, events.COMPLIANCE_CASE_CREATED, organization_id=factory.organization_id,
        factory_id=factory.id, actor_user_id=principal.user_id,
        correlation_id=case.id,
        payload={"case_id": case.id, "rule_id": case.rule_id,
                 "rule_pack": case.rule_pack, "severity": case.severity,
                 "title": case.title},
    )
    db.commit()
    get_db_sync().sync_compliance_case(case.id, {
        "title": case.title, "factory_id": case.factory_id, "organization_id": case.organization_id,
        "severity": case.severity, "status": case.status, "flow_state": case.flow_state,
        "rule_id": case.rule_id, "due_date": str(case.due_date) if case.due_date else None,
    })
    return _case_out(db, case)


@router.get("/compliance/cases/{case_id}", response_model=ComplianceCaseOut)
def get_case(case_id: str, principal: CurrentPrincipal, db: DbSession) -> ComplianceCaseOut:
    return _case_out(db, _case_or_404(db, principal, case_id))


@router.patch("/compliance/cases/{case_id}", response_model=ComplianceCaseOut)
def update_case(case_id: str, body: ComplianceCasePatch, principal: CurrentPrincipal,
                db: DbSession, ip: ClientIp) -> ComplianceCaseOut:
    case = _case_or_404(db, principal, case_id, write=True)
    if case.closed_at is not None:
        raise Conflict(
            "This case is closed. Reopening it is not supported; raise a new case "
            "so the closed record stays intact.",
            "case_closed",
        )

    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    before = {k: getattr(case, k) for k in patch}
    for key, value in patch.items():
        setattr(case, key, value)

    # Raising severity to high or critical pulls a human in, whoever set it.
    if case.severity in ("high", "critical"):
        case.requires_human_review = True

    audit.record(
        db, action="compliance.case.update", object_type="compliance_case",
        object_id=case.id, organization_id=case.organization_id,
        actor_user_id=principal.user_id, actor_label=principal.user.email,
        old_value=before, new_value=patch, ip_address=ip,
    )
    db.commit()
    get_db_sync().sync_compliance_case(case.id, {
        "title": case.title, "factory_id": case.factory_id, "organization_id": case.organization_id,
        "severity": case.severity, "status": case.status, "flow_state": case.flow_state,
        "due_date": str(case.due_date) if case.due_date else None,
    })
    return _case_out(db, case)


@router.post("/compliance/cases/{case_id}/evidence", response_model=ComplianceCaseOut)
def attach_evidence(case_id: str, evidence_id: str, principal: CurrentPrincipal,
                    db: DbSession, ip: ClientIp) -> ComplianceCaseOut:
    """Attach an already-uploaded document to a case."""
    case = _case_or_404(db, principal, case_id, write=True)
    document = db.get(EvidenceDocument, evidence_id)
    if document is None or document.deleted_at is not None:
        raise NotFound("Evidence not found.")
    if document.factory_id != case.factory_id:
        # Evidence from another factory cannot back this factory's case, even
        # inside the same organization.
        raise BadRequest(
            "That document belongs to a different factory.", "evidence_factory_mismatch",
        )

    existing = db.scalar(
        select(EvidenceLink).where(
            EvidenceLink.evidence_id == document.id,
            EvidenceLink.target_type == "compliance_case",
            EvidenceLink.target_id == case.id,
        )
    )
    if existing is None:
        db.add(EvidenceLink(
            evidence_id=document.id, target_type="compliance_case", target_id=case.id,
            role="supporting_evidence", created_at=utcnow(),
            created_by_user_id=principal.user_id,
        ))

    if case.flow_state in ("FLAGGED", "ACKNOWLEDGED", "CORRECTIVE_ACTION"):
        case.flow_state = "EVIDENCE_SUBMITTED"

    audit.record(
        db, action="compliance.case.evidence", object_type="compliance_case",
        object_id=case.id, organization_id=case.organization_id,
        actor_user_id=principal.user_id, actor_label=principal.user.email,
        evidence_ids=[document.id], ip_address=ip,
        new_value={"flow_state": case.flow_state},
    )
    db.commit()
    return _case_out(db, case)


@router.post("/compliance/cases/{case_id}/close", response_model=ComplianceCaseOut)
def close_case(case_id: str, body: CloseCaseRequest, principal: CurrentPrincipal,
               db: DbSession, ip: ClientIp) -> ComplianceCaseOut:
    """Close a case with a recorded reason.

    A case flagged for human review cannot be closed without evidence attached.
    Closing a high-severity finding on an empty record is exactly the shortcut
    that makes a compliance trail worthless.
    """
    case = _case_or_404(db, principal, case_id, write=True)
    if case.closed_at is not None:
        raise Conflict("This case is already closed.", "case_closed")

    for evidence_id in body.evidence_ids:
        document = db.get(EvidenceDocument, evidence_id)
        if document is None or document.factory_id != case.factory_id:
            raise NotFound(f"Evidence '{evidence_id}' not found for this factory.")
        if db.scalar(
            select(EvidenceLink).where(
                EvidenceLink.evidence_id == evidence_id,
                EvidenceLink.target_type == "compliance_case",
                EvidenceLink.target_id == case.id,
            )
        ) is None:
            db.add(EvidenceLink(
                evidence_id=evidence_id, target_type="compliance_case",
                target_id=case.id, role="closing_evidence", created_at=utcnow(),
                created_by_user_id=principal.user_id,
            ))
    db.flush()

    # Every blocker at once. Handing them back one at a time turns closing a
    # case into a guessing game of repeated requests.
    blockers: list[dict] = []

    open_actions = db.scalars(
        select(CorrectiveAction).where(
            CorrectiveAction.case_id == case.id,
            CorrectiveAction.status.in_(("OPEN", "IN_PROGRESS", "BLOCKED")),
        )
    ).all()
    if open_actions:
        blockers.append({
            "code": "corrective_actions_open",
            "message": f"{len(open_actions)} corrective action(s) are still open.",
            "corrective_action_ids": [a.id for a in open_actions],
        })

    attached = db.scalar(
        select(func.count()).select_from(EvidenceLink).where(
            EvidenceLink.target_type == "compliance_case",
            EvidenceLink.target_id == case.id,
        )
    ) or 0
    if case.requires_human_review and attached == 0:
        blockers.append({
            "code": "closing_evidence_required",
            "message": (
                "This case is marked for human review, so it cannot be closed "
                "without at least one supporting document."
            ),
            "severity": case.severity,
        })

    if blockers:
        raise Conflict(
            "This case cannot be closed yet: "
            + " ".join(b["message"] for b in blockers),
            "case_not_closeable",
            {"blockers": blockers},
        )

    case.closed_at = utcnow()
    case.closed_reason = body.reason
    case.flow_state = "CLOSED"
    case.status = "READY"
    case.reviewer_user_id = case.reviewer_user_id or principal.user_id

    audit.record(
        db, action="compliance.case.close", object_type="compliance_case",
        object_id=case.id, organization_id=case.organization_id,
        actor_user_id=principal.user_id, actor_label=principal.user.email,
        reason=body.reason, evidence_ids=body.evidence_ids, ip_address=ip,
        new_value={"status": "READY", "flow_state": "CLOSED"},
    )
    events.emit(
        db, events.COMPLIANCE_CASE_CLOSED, organization_id=case.organization_id,
        factory_id=case.factory_id, actor_user_id=principal.user_id,
        correlation_id=case.id, evidence_ids=body.evidence_ids,
        payload={"case_id": case.id, "rule_id": case.rule_id, "reason": body.reason},
    )
    db.commit()
    return _case_out(db, case)


# --------------------------------------------------------------------------
# corrective actions
# --------------------------------------------------------------------------

@router.post("/compliance/cases/{case_id}/corrective-actions",
             response_model=ComplianceCaseOut, status_code=status.HTTP_201_CREATED)
def add_corrective_action(case_id: str, body: CorrectiveActionIn,
                          principal: CurrentPrincipal, db: DbSession,
                          ip: ClientIp) -> ComplianceCaseOut:
    case = _case_or_404(db, principal, case_id, write=True)
    if case.closed_at is not None:
        raise Conflict("This case is closed.", "case_closed")

    action = CorrectiveAction(case_id=case.id, **body.model_dump())
    db.add(action)
    if case.flow_state == "FLAGGED":
        case.flow_state = "CORRECTIVE_ACTION"
    db.flush()

    audit.record(
        db, action="compliance.corrective_action.create",
        object_type="corrective_action", object_id=action.id,
        organization_id=case.organization_id, actor_user_id=principal.user_id,
        actor_label=principal.user.email, ip_address=ip,
        new_value={"case_id": case.id, "title": action.title,
                   "due_date": str(action.due_date) if action.due_date else None},
    )
    events.emit(
        db, events.CORRECTIVE_ACTION_CREATED, organization_id=case.organization_id,
        factory_id=case.factory_id, actor_user_id=principal.user_id,
        correlation_id=case.id,
        payload={"case_id": case.id, "corrective_action_id": action.id,
                 "title": action.title},
    )
    db.commit()
    return _case_out(db, case)


@router.patch("/compliance/corrective-actions/{action_id}",
              response_model=CorrectiveActionOut)
def update_corrective_action(action_id: str, body: CorrectiveActionPatch,
                             principal: CurrentPrincipal, db: DbSession,
                             ip: ClientIp) -> CorrectiveActionOut:
    action = db.get(CorrectiveAction, action_id)
    if action is None:
        raise NotFound("Corrective action not found.")
    case = _case_or_404(db, principal, action.case_id, write=True)

    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    before = {k: getattr(action, k) for k in patch}
    for key, value in patch.items():
        setattr(action, key, value)
    if patch.get("status") == "DONE" and action.completed_at is None:
        action.completed_at = utcnow()

    audit.record(
        db, action="compliance.corrective_action.update",
        object_type="corrective_action", object_id=action.id,
        organization_id=case.organization_id, actor_user_id=principal.user_id,
        actor_label=principal.user.email, old_value=before, new_value=patch,
        ip_address=ip,
    )
    db.commit()
    return _corrective_out(action, dt.date.today())
