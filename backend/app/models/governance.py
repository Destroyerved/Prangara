"""
Event outbox, notifications, audit log and compliance case records.

Split of ownership (task.md sections 5 and 6): BE-1 owns the *transport* - the
outbox table, the worker loop, notification delivery, audit writes, and CRUD on
compliance cases and corrective actions. BE-2 owns what decides a case: rule
packs, the evaluator and RAG citations. So nothing in this file evaluates a
rule; it stores the verdict and who is accountable for it.

The outbox is a table rather than a queue, per DATA_RAG_COMPLIANCE section 27:
the event row is written inside the same transaction as the business change, so
an event can never describe something that was rolled back.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Index, Integer, JSON, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, id_column

COMPLIANCE_STATUSES = (
    "READY", "PARTIAL", "MISSING", "AT_RISK", "ACTION_REQUIRED", "HUMAN_REVIEW_REQUIRED",
)
CASE_FLOW = ("FLAGGED", "ACKNOWLEDGED", "CORRECTIVE_ACTION", "EVIDENCE_SUBMITTED", "REVIEW", "CLOSED")
EVENT_STATUSES = ("PENDING", "PROCESSING", "PROCESSED", "FAILED", "DEAD")


class Event(Base):
    """Outbox row. Envelope shape is DATA_RAG_COMPLIANCE section 25."""

    __tablename__ = "events"
    __table_args__ = (
        Index("ix_events_status_time", "status", "occurred_at"),
        Index("ix_events_tenant_type", "organization_id", "event_type"),
    )

    id: Mapped[str] = id_column("evt")
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    organization_id: Mapped[str | None] = mapped_column(ForeignKey("organizations.id"))
    factory_id: Mapped[str | None] = mapped_column(ForeignKey("factories.id"))
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="platform")

    occurred_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    evidence_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    correlation_id: Mapped[str | None] = mapped_column(String(64), index=True)

    status: Mapped[str] = mapped_column(String(16), nullable=False, default="PENDING")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_unread", "user_id", "read_at"),)

    id: Mapped[str] = id_column("ntf")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    organization_id: Mapped[str | None] = mapped_column(ForeignKey("organizations.id"))
    factory_id: Mapped[str | None] = mapped_column(ForeignKey("factories.id"))
    event_id: Mapped[str | None] = mapped_column(ForeignKey("events.id"))

    kind: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="info")
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    # Where tapping the notification should land, as a route the mobile and web
    # clients both understand (for example "factory/fac_x/leaks").
    deep_link: Mapped[str | None] = mapped_column(String(255))

    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    read_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class AuditLog(Base):
    """Append-only record of who changed what. PRD FR-48.

    There is no update or delete path for this table anywhere in the codebase.
    """

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_object", "object_type", "object_id"),
        Index("ix_audit_org_time", "organization_id", "created_at"),
    )

    id: Mapped[str] = id_column("aud")
    organization_id: Mapped[str | None] = mapped_column(ForeignKey("organizations.id"))
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    actor_label: Mapped[str | None] = mapped_column(String(160))
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    object_type: Mapped[str] = mapped_column(String(48), nullable=False)
    object_id: Mapped[str] = mapped_column(String(48), nullable=False)

    old_value: Mapped[dict | None] = mapped_column(JSON)
    new_value: Mapped[dict | None] = mapped_column(JSON)
    reason: Mapped[str | None] = mapped_column(Text)
    evidence_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    correlation_id: Mapped[str | None] = mapped_column(String(64), index=True)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ComplianceCase(TimestampMixin, Base):
    """A flagged compliance finding. PRD FR-49.

    `rule_id` and `rule_pack_version` are stored, never a rendered legal claim.
    The wording rules in DATA_RAG_COMPLIANCE section 34 apply to whatever the UI
    puts around this row: readiness and risk, not certification.
    """

    __tablename__ = "compliance_cases"
    __table_args__ = (Index("ix_cases_factory_status", "factory_id", "status"),)

    id: Mapped[str] = id_column("cmp")
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id: Mapped[str | None] = mapped_column(ForeignKey("assessments.id", ondelete="SET NULL"))

    rule_id: Mapped[str] = mapped_column(String(64), nullable=False)
    rule_pack: Mapped[str] = mapped_column(String(48), nullable=False)
    rule_pack_version: Mapped[str] = mapped_column(String(32), nullable=False)
    source_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ACTION_REQUIRED")
    flow_state: Mapped[str] = mapped_column(String(32), nullable=False, default="FLAGGED")
    requires_human_review: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    title: Mapped[str] = mapped_column(String(240), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    required_evidence: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    owner_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    reviewer_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    due_date: Mapped[dt.date | None] = mapped_column(Date)
    closed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    closed_reason: Mapped[str | None] = mapped_column(Text)


class CorrectiveAction(TimestampMixin, Base):
    __tablename__ = "corrective_actions"

    id: Mapped[str] = id_column("cra")
    case_id: Mapped[str] = mapped_column(
        ForeignKey("compliance_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    assigned_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    due_date: Mapped[dt.date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="OPEN")
    completed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
