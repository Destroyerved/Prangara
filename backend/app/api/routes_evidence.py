"""
Evidence vault endpoints. PRD FR-47.

Upload is multipart because that is what a phone camera produces. Everything
else about the document - what it proves, what period it covers, what it is
attached to - is metadata set after the bytes land, so a poor-network mobile
client can upload once and annotate later without re-sending the file.
"""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, File, Form, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.api.deps import ClientIp, CurrentPrincipal, DbSession
from app.core.errors import BadRequest, Conflict, Forbidden, NotFound
from app.models.base import utcnow
from app.models.evidence import EVIDENCE_TYPES, EvidenceDocument, EvidenceLink
from app.schemas.evidence import EvidenceLinkIn, EvidenceLinkOut, EvidenceOut, EvidenceUpdate
from app.services import audit, events, storage
from app.services.access import accessible_factory_ids, resolve_factory

router = APIRouter(prefix="/api/evidence", tags=["evidence"])


def _out(db: DbSession, doc: EvidenceDocument) -> EvidenceOut:
    links = db.scalars(
        select(EvidenceLink).where(EvidenceLink.evidence_id == doc.id)
    ).all()
    out = EvidenceOut.model_validate(doc)
    out.links = [EvidenceLinkOut.model_validate(link) for link in links]
    out.download_url = f"/api/evidence/{doc.id}/download"
    return out


@router.post("", response_model=EvidenceOut, status_code=status.HTTP_201_CREATED)
def upload_evidence(
    principal: CurrentPrincipal,
    db: DbSession,
    ip: ClientIp,
    file: UploadFile = File(...),
    factory_id: str | None = Form(default=None),
    evidence_type: str = Form(default="other"),
    title: str | None = Form(default=None),
    description: str | None = Form(default=None),
    document_date: dt.date | None = Form(default=None),
    period_start: dt.date | None = Form(default=None),
    period_end: dt.date | None = Form(default=None),
    expires_at: dt.date | None = Form(default=None),
    client_ref: str | None = Form(default=None),
) -> EvidenceOut:
    if evidence_type not in EVIDENCE_TYPES:
        raise BadRequest(
            f"evidence_type must be one of {', '.join(EVIDENCE_TYPES)}.", "unknown_evidence_type"
        )

    organization_id = principal.active_org_id
    if factory_id:
        factory = resolve_factory(db, principal, factory_id, write=True)
        organization_id = factory.organization_id
    if not organization_id:
        raise Forbidden("You are not a member of any organization.")

    # M2: Offline queue idempotency check
    if client_ref:
        stmt = select(EvidenceDocument).where(
            EvidenceDocument.organization_id == organization_id,
            EvidenceDocument.client_ref == client_ref,
            EvidenceDocument.deleted_at.is_(None),
        )
        if factory_id:
            stmt = stmt.where(EvidenceDocument.factory_id == factory_id)
        existing_client_ref = db.scalar(stmt)
        if existing_client_ref is not None:
            return _out(db, existing_client_ref)

    document = EvidenceDocument(
        organization_id=organization_id,
        factory_id=factory_id,
        uploaded_by_user_id=principal.user_id,
        evidence_type=evidence_type,
        title=(title or file.filename or "Evidence").strip()[:240],
        description=description,
        filename=(file.filename or "upload")[:255],
        content_type=file.content_type or "application/octet-stream",
        content_sha256="",
        storage_key="",
        document_date=document_date,
        period_start=period_start,
        period_end=period_end,
        expires_at=expires_at,
        client_ref=client_ref,
    )
    db.add(document)
    db.flush()

    stored = storage.store(
        file.file, content_type=document.content_type,
        organization_id=organization_id, document_id=document.id,
    )

    # DATA_RAG_COMPLIANCE section 32: the same bytes uploaded twice is a
    # duplicate document, whatever the filename says. It is reported, not
    # silently merged, because a genuine reissue of the same bill exists too.
    duplicate = db.scalar(
        select(EvidenceDocument).where(
            EvidenceDocument.organization_id == organization_id,
            EvidenceDocument.content_sha256 == stored.content_sha256,
            EvidenceDocument.id != document.id,
            EvidenceDocument.deleted_at.is_(None),
        )
    )
    if duplicate is not None:
        storage.delete(stored.storage_key, stored.storage_backend)
        db.delete(document)
        db.commit()
        raise Conflict(
            "This exact file has already been uploaded.", "duplicate_evidence",
            {"existing_evidence_id": duplicate.id, "title": duplicate.title},
        )

    document.storage_key = stored.storage_key
    document.storage_backend = stored.storage_backend
    document.size_bytes = stored.size_bytes
    document.content_sha256 = stored.content_sha256
    document.content_type = stored.content_type

    audit.record(
        db, action="evidence.upload", object_type="evidence_document", object_id=document.id,
        organization_id=organization_id, actor_user_id=principal.user_id,
        actor_label=principal.user.email, ip_address=ip,
        new_value={"filename": document.filename, "evidence_type": evidence_type,
                   "size_bytes": stored.size_bytes, "sha256": stored.content_sha256},
    )
    events.emit(
        db, events.EVIDENCE_UPLOADED, organization_id=organization_id, factory_id=factory_id,
        actor_user_id=principal.user_id, evidence_ids=[document.id],
        payload={"evidence_id": document.id, "evidence_type": evidence_type},
    )
    db.commit()
    return _out(db, document)


@router.get("", response_model=list[EvidenceOut])
def list_evidence(principal: CurrentPrincipal, db: DbSession,
                  factory_id: str | None = None,
                  evidence_type: str | None = None,
                  limit: int = Query(default=50, ge=1, le=200)) -> list[EvidenceOut]:
    stmt = select(EvidenceDocument).where(EvidenceDocument.deleted_at.is_(None))
    if factory_id:
        resolve_factory(db, principal, factory_id)
        stmt = stmt.where(EvidenceDocument.factory_id == factory_id)
    elif not principal.is_platform_admin:
        ids = accessible_factory_ids(db, principal)
        stmt = stmt.where(
            (EvidenceDocument.organization_id.in_(principal.org_ids or {""}))
            | (EvidenceDocument.factory_id.in_(ids or [""]))
        )
    if evidence_type:
        stmt = stmt.where(EvidenceDocument.evidence_type == evidence_type)
    rows = db.scalars(stmt.order_by(EvidenceDocument.created_at.desc()).limit(limit)).all()
    return [_out(db, r) for r in rows]


def _document_or_404(db: DbSession, principal: CurrentPrincipal, evidence_id: str,
                     write: bool = False) -> EvidenceDocument:
    document = db.get(EvidenceDocument, evidence_id)
    if document is None or document.deleted_at is not None:
        raise NotFound("Evidence not found.")
    if document.factory_id:
        resolve_factory(db, principal, document.factory_id, write=write)
    elif not principal.is_platform_admin and document.organization_id not in principal.org_ids:
        raise NotFound("Evidence not found.")
    return document


@router.get("/{evidence_id}", response_model=EvidenceOut)
def get_evidence(evidence_id: str, principal: CurrentPrincipal, db: DbSession) -> EvidenceOut:
    return _out(db, _document_or_404(db, principal, evidence_id))


@router.get("/{evidence_id}/download")
def download_evidence(evidence_id: str, principal: CurrentPrincipal,
                      db: DbSession) -> StreamingResponse:
    document = _document_or_404(db, principal, evidence_id)
    try:
        stream = storage.open_stream(document.storage_key, document.storage_backend)
    except FileNotFoundError:
        raise NotFound("The stored file is missing.") from None
    return StreamingResponse(
        stream, media_type=document.content_type,
        headers={"Content-Disposition": f'inline; filename="{document.filename}"'},
    )


@router.patch("/{evidence_id}", response_model=EvidenceOut)
def update_evidence(evidence_id: str, body: EvidenceUpdate, principal: CurrentPrincipal,
                    db: DbSession) -> EvidenceOut:
    document = _document_or_404(db, principal, evidence_id, write=True)
    for key, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(document, key, value)
    db.commit()
    return _out(db, document)


@router.post("/{evidence_id}/links", response_model=EvidenceOut,
             status_code=status.HTTP_201_CREATED)
def link_evidence(evidence_id: str, body: EvidenceLinkIn, principal: CurrentPrincipal,
                  db: DbSession) -> EvidenceOut:
    document = _document_or_404(db, principal, evidence_id, write=True)
    existing = db.scalar(
        select(EvidenceLink).where(
            EvidenceLink.evidence_id == document.id,
            EvidenceLink.target_type == body.target_type,
            EvidenceLink.target_id == body.target_id,
        )
    )
    if existing is None:
        db.add(EvidenceLink(
            evidence_id=document.id, target_type=body.target_type,
            target_id=body.target_id, role=body.role,
            created_at=utcnow(), created_by_user_id=principal.user_id,
        ))
        db.commit()
    return _out(db, document)


@router.post("/{evidence_id}/verify", response_model=EvidenceOut)
def verify_evidence(evidence_id: str, principal: CurrentPrincipal, db: DbSession,
                    ip: ClientIp) -> EvidenceOut:
    """Mark a document reviewed by a person.

    This is the step PRD section 29 requires before an extracted value can be
    treated as confirmed - a human, not the extractor, says the document says
    what the extraction claims.
    """
    document = _document_or_404(db, principal, evidence_id, write=True)
    document.verification_status = "reviewed"
    document.verified_by_user_id = principal.user_id
    document.verified_at = utcnow()
    audit.record(
        db, action="evidence.verify", object_type="evidence_document", object_id=document.id,
        organization_id=document.organization_id, actor_user_id=principal.user_id,
        actor_label=principal.user.email, ip_address=ip,
        new_value={"verification_status": "reviewed"},
    )
    events.emit(
        db, events.EVIDENCE_VERIFIED, organization_id=document.organization_id,
        factory_id=document.factory_id, actor_user_id=principal.user_id,
        evidence_ids=[document.id], payload={"evidence_id": document.id},
    )
    db.commit()
    return _out(db, document)


@router.delete("/{evidence_id}")
def delete_evidence(evidence_id: str, principal: CurrentPrincipal, db: DbSession,
                    ip: ClientIp, reason: str | None = None) -> dict[str, bool]:
    """Soft delete.

    The row and the audit trail survive. Evidence that backed a past assessment
    cannot be made to have never existed, or the assessment stops being
    auditable - which is the whole point of the vault.
    """
    document = _document_or_404(db, principal, evidence_id, write=True)
    document.deleted_at = utcnow()
    audit.record(
        db, action="evidence.delete", object_type="evidence_document", object_id=document.id,
        organization_id=document.organization_id, actor_user_id=principal.user_id,
        actor_label=principal.user.email, reason=reason, ip_address=ip,
    )
    db.commit()
    return {"ok": True}
