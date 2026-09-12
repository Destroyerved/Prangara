"""
Evidence vault. PRD FR-47.

An evidence document is a stored file plus the metadata that makes it usable as
proof: what kind of document it is, what period it covers, who uploaded it and
when it stops being current. `EvidenceLink` attaches one document to any number
of objects - an activity record, an asset, an action, a compliance case - so the
same electricity bill can back a Scope 2 figure and a BRSR readiness item
without being uploaded twice.

`content_sha256` exists to catch the duplicate-invoice plausibility rule in
DATA_RAG_COMPLIANCE section 32. Two uploads of the same bytes are the same
document, whatever the filename says.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    Date, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, id_column

EVIDENCE_TYPES = (
    "electricity_bill", "gas_bill", "fuel_invoice", "material_invoice",
    "waste_certificate", "freight_invoice", "calibration_certificate",
    "equipment_certificate", "installation_photo", "meter_photo",
    "vendor_quote", "audit_note", "regulator_document", "other",
)

# Objects an evidence document can be attached to.
LINK_TARGETS = (
    "factory", "factory_profile", "activity_record", "asset",
    "assessment", "action", "compliance_case", "quote", "implementation_job",
)


class EvidenceDocument(TimestampMixin, Base):
    __tablename__ = "evidence_documents"
    __table_args__ = (
        Index("ix_evidence_factory_type", "factory_id", "evidence_type"),
        Index("ix_evidence_org_hash", "organization_id", "content_sha256"),
    )

    id: Mapped[str] = id_column("evd")
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    factory_id: Mapped[str | None] = mapped_column(ForeignKey("factories.id"), index=True)
    uploaded_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

    evidence_type: Mapped[str] = mapped_column(String(48), nullable=False, default="other")
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # Backend-agnostic key. For local storage it is a path under
    # STORAGE_LOCAL_DIR; for MinIO/S3 it is the object key.
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_backend: Mapped[str] = mapped_column(String(16), nullable=False, default="local")

    document_date: Mapped[dt.date | None] = mapped_column(Date)
    period_start: Mapped[dt.date | None] = mapped_column(Date)
    period_end: Mapped[dt.date | None] = mapped_column(Date)
    expires_at: Mapped[dt.date | None] = mapped_column(Date)

    # extracted_unverified | user_confirmed | reviewed  (PRD FR-05)
    verification_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="extracted_unverified"
    )
    verified_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    verified_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    # Raw OCR/extraction payload, kept so a correction can be compared against
    # what the extractor originally proposed. Owned by BE-2 schemas.
    extraction: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    extraction_confidence: Mapped[float | None] = mapped_column(Float)
    client_ref: Mapped[str | None] = mapped_column(String(128), index=True)

    deleted_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class EvidenceLink(Base):
    __tablename__ = "evidence_links"
    __table_args__ = (
        UniqueConstraint("evidence_id", "target_type", "target_id", name="uq_evidence_link"),
        Index("ix_evidence_link_target", "target_type", "target_id"),
    )

    id: Mapped[str] = id_column("evl")
    evidence_id: Mapped[str] = mapped_column(
        ForeignKey("evidence_documents.id"), nullable=False, index=True
    )
    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    target_id: Mapped[str] = mapped_column(String(32), nullable=False)
    role: Mapped[str | None] = mapped_column(String(48))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
