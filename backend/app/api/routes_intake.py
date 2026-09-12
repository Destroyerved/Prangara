"""
Intake endpoints: conversation, bill scan, equipment scan. PRD FR-04 to FR-06.

Every route here follows the same contract:

    extract -> return unconfirmed fields -> user confirms -> /confirm writes rows

Nothing an extractor produces is persisted as factory data until a person has
confirmed it. That is PRD section 29, and it is why `/extract` never writes and
`/confirm` never extracts.

OCR runtime ownership: the PaddleOCR pipeline and the per-document extraction
schemas are BE-2's (task.md section 5). BE-1 owns this contract, the evidence
storage and the confirmation path. When no OCR runtime is wired in, these
endpoints say so and return the stored evidence id so the mobile flow can fall
through to manual entry - they do not fabricate an extraction.
"""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, File, Form, UploadFile
from sqlalchemy import select

from app.api.deps import ClientIp, CurrentPrincipal, DbSession
from app.core.errors import BadRequest, NotFound
from app.models.base import utcnow
from app.models.evidence import EvidenceDocument
from app.models.factory import ActivityRecord, FactoryProfile
from app.schemas.intake import (
    ConfirmIntakeRequest, ConfirmIntakeResponse, ConversationExtractRequest,
    ConversationExtractResponse, DocumentExtractResponse, EquipmentExtractResponse,
)
from app.services import audit, events, storage
from app.services.access import resolve_factory
from app.services.intake_extract import (
    extract as extract_conversation,
    extract_document_content,
    extract_equipment_content,
)

router = APIRouter(prefix="/api/intake", tags=["intake"])

_OCR_UNAVAILABLE = (
    "No OCR runtime is configured on this deployment, so nothing was read from the "
    "image. The file has been stored as evidence - enter the values from it and they "
    "will be linked to this document."
)


@router.post("/conversation/extract", response_model=ConversationExtractResponse)
def conversation_extract(body: ConversationExtractRequest, principal: CurrentPrincipal,
                         db: DbSession) -> ConversationExtractResponse:
    if body.factory_id:
        resolve_factory(db, principal, body.factory_id)
    known = dict(body.known)
    if body.sector:
        known.setdefault("sector", body.sector)
    return ConversationExtractResponse.model_validate(
        extract_conversation(body.message, known)
    )


@router.post("/document/extract", response_model=DocumentExtractResponse)
def document_extract(
    principal: CurrentPrincipal,
    db: DbSession,
    ip: ClientIp,
    file: UploadFile = File(...),
    factory_id: str = Form(...),
    evidence_type: str = Form(default="electricity_bill"),
    period_start: dt.date | None = Form(default=None),
    period_end: dt.date | None = Form(default=None),
) -> DocumentExtractResponse:
    """Store a bill or invoice and attempt extraction. PRD FR-05."""
    factory = resolve_factory(db, principal, factory_id, write=True)

    document = EvidenceDocument(
        organization_id=factory.organization_id,
        factory_id=factory.id,
        uploaded_by_user_id=principal.user_id,
        evidence_type=evidence_type,
        title=(file.filename or evidence_type)[:240],
        filename=(file.filename or "upload")[:255],
        content_type=file.content_type or "application/octet-stream",
        content_sha256="",
        storage_key="",
        period_start=period_start,
        period_end=period_end,
        verification_status="extracted_unverified",
    )
    db.add(document)
    db.flush()

    content_bytes = b""
    try:
        content_bytes = file.file.read()
        file.file.seek(0)
    except Exception:
        pass

    stored = storage.store(
        file.file, content_type=document.content_type,
        organization_id=factory.organization_id, document_id=document.id,
    )
    document.storage_key = stored.storage_key
    document.storage_backend = stored.storage_backend
    document.size_bytes = stored.size_bytes
    document.content_sha256 = stored.content_sha256
    document.content_type = stored.content_type

    audit.record(
        db, action="intake.document", object_type="evidence_document", object_id=document.id,
        organization_id=factory.organization_id, actor_user_id=principal.user_id,
        actor_label=principal.user.email, ip_address=ip,
        new_value={"evidence_type": evidence_type, "sha256": stored.content_sha256},
    )
    events.emit(
        db, events.EVIDENCE_UPLOADED, organization_id=factory.organization_id,
        factory_id=factory.id, actor_user_id=principal.user_id,
        evidence_ids=[document.id],
        payload={"evidence_id": document.id, "evidence_type": evidence_type,
                 "via": "intake"},
    )
    db.commit()

    extracted = extract_document_content(content_bytes, file.filename or "", evidence_type)
    return DocumentExtractResponse(
        evidence_id=document.id,
        document_type=evidence_type,
        extractor=extracted["extractor"],
        extractor_detail=extracted["extractor_detail"],
        fields=extracted["fields"],
        suggested_activity_records=extracted["suggested_activity_records"],
        period_start=period_start,
        period_end=period_end,
        warnings=extracted["warnings"],
    )


@router.post("/equipment/extract", response_model=EquipmentExtractResponse)
def equipment_extract(
    principal: CurrentPrincipal,
    db: DbSession,
    file: UploadFile = File(...),
    factory_id: str = Form(...),
) -> EquipmentExtractResponse:
    """Store a nameplate photo and attempt extraction. PRD FR-06."""
    factory = resolve_factory(db, principal, factory_id, write=True)

    document = EvidenceDocument(
        organization_id=factory.organization_id,
        factory_id=factory.id,
        uploaded_by_user_id=principal.user_id,
        evidence_type="equipment_certificate",
        title=(file.filename or "Nameplate")[:240],
        filename=(file.filename or "nameplate")[:255],
        content_type=file.content_type or "application/octet-stream",
        content_sha256="",
        storage_key="",
        verification_status="extracted_unverified",
    )
    db.add(document)
    db.flush()

    content_bytes = b""
    try:
        content_bytes = file.file.read()
        file.file.seek(0)
    except Exception:
        pass

    stored = storage.store(
        file.file, content_type=document.content_type,
        organization_id=factory.organization_id, document_id=document.id,
    )
    document.storage_key = stored.storage_key
    document.storage_backend = stored.storage_backend
    document.size_bytes = stored.size_bytes
    document.content_sha256 = stored.content_sha256
    document.content_type = stored.content_type
    db.commit()

    eq_extracted = extract_equipment_content(content_bytes, file.filename or "")
    return EquipmentExtractResponse(
        evidence_id=document.id,
        extractor=eq_extracted["extractor"],
        extractor_detail=eq_extracted["extractor_detail"],
        fields=eq_extracted["fields"],
        # These are asked whether or not OCR ran. A nameplate gives rated power;
        # annual energy needs how the machine is actually used.
        required_questions=[
            "How many hours a year does this machine run?",
            "What load does it typically run at, as a percentage of its rating?",
            "Is it driven by electricity, or by a fuel?",
        ],
    )


@router.post("/factories/{factory_id}/confirm", response_model=ConfirmIntakeResponse)
def confirm_intake(factory_id: str, body: ConfirmIntakeRequest, principal: CurrentPrincipal,
                   db: DbSession, ip: ClientIp) -> ConfirmIntakeResponse:
    """Write confirmed intake values into the profile and activity records.

    This is the only path by which an extracted value becomes factory data, and
    it stamps who confirmed it and when.
    """
    factory = resolve_factory(db, principal, factory_id, write=True)
    profile = db.scalar(
        select(FactoryProfile).where(FactoryProfile.factory_id == factory_id)
        .order_by(FactoryProfile.created_at.desc()).limit(1)
    )
    if profile is None:
        raise NotFound("This factory has no reporting period yet.")

    if body.evidence_id:
        evidence = db.get(EvidenceDocument, body.evidence_id)
        if evidence is None or evidence.factory_id != factory_id:
            raise NotFound("Evidence not found for this factory.")

    allowed = {
        "annual_output_t", "output_unit", "annual_revenue_cr", "employees",
        "operating_days", "shifts_per_day", "export_share_pct", "eu_export_share_pct",
        "tariff_inr_per_kwh", "discount_rate", "period_start", "period_end",
    }
    rejected = sorted(set(body.profile_updates) - allowed)
    if rejected:
        raise BadRequest(
            f"These fields cannot be set through intake: {', '.join(rejected)}.",
            "unwritable_field", {"allowed": sorted(allowed)},
        )

    updated: list[str] = []
    states = dict(profile.field_states or {})
    for key, value in body.profile_updates.items():
        setattr(profile, key, value)
        updated.append(key)
        states[key] = "DOCUMENT-CONFIRMED" if body.evidence_id else "DECLARED"
    profile.field_states = states

    created: list[str] = []
    now = utcnow()
    for item in body.activity_records:
        if item.client_ref:
            existing = db.scalar(
                select(ActivityRecord).where(
                    ActivityRecord.factory_id == factory.id,
                    ActivityRecord.client_ref == item.client_ref,
                )
            )
            if existing is not None:
                created.append(existing.id)
                continue

        record = ActivityRecord(
            factory_id=factory.id,
            profile_id=profile.id,
            **{**item.model_dump(), "source_kind": body.source_kind},
        )
        record.confirmed_by_user_id = principal.user_id
        record.confirmed_at = now
        db.add(record)
        db.flush()
        created.append(record.id)
        if body.evidence_id:
            from app.models.evidence import EvidenceLink

            db.add(EvidenceLink(
                evidence_id=body.evidence_id, target_type="activity_record",
                target_id=record.id, role="source_document",
                created_at=now, created_by_user_id=principal.user_id,
            ))

    if body.evidence_id:
        evidence = db.get(EvidenceDocument, body.evidence_id)
        if evidence is not None and evidence.verification_status == "extracted_unverified":
            evidence.verification_status = "user_confirmed"

    audit.record(
        db, action="intake.confirm", object_type="factory_profile", object_id=profile.id,
        organization_id=factory.organization_id, actor_user_id=principal.user_id,
        actor_label=principal.user.email, ip_address=ip,
        evidence_ids=[body.evidence_id] if body.evidence_id else [],
        new_value={"profile_fields": updated, "activity_records": len(created),
                   "source_kind": body.source_kind},
    )
    events.emit(
        db, events.ACTIVITY_RECORD_ADDED, organization_id=factory.organization_id,
        factory_id=factory.id, actor_user_id=principal.user_id,
        evidence_ids=[body.evidence_id] if body.evidence_id else [],
        payload={"source_kind": body.source_kind, "count": len(created)},
    )
    db.commit()
    return ConfirmIntakeResponse(
        profile_id=profile.id,
        created_activity_record_ids=created,
        updated_profile_fields=updated,
    )
