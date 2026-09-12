"""
Notification centre and audit trail reads. PRD FR-54 and FR-48.

Notifications are per-user rows written by the outbox worker, so this module
only reads and marks them. The decision about what deserves a notification
lives with the event handlers, not here.
"""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Query
from pydantic import Field
from sqlalchemy import select

from app.api.deps import CurrentPrincipal, DbSession
from app.core.errors import NotFound
from app.models.base import utcnow
from app.models.governance import AuditLog, Event, Notification
from app.schemas.common import ApiModel
from app.services.access import resolve_factory

router = APIRouter(prefix="/api", tags=["notifications"])


class NotificationOut(ApiModel):
    id: str
    kind: str
    severity: str
    title: str
    body: str | None = None
    deep_link: str | None = None
    factory_id: str | None = None
    created_at: dt.datetime
    read_at: dt.datetime | None = None


class AuditEntryOut(ApiModel):
    id: str
    action: str
    object_type: str
    object_id: str
    actor_user_id: str | None = None
    actor_label: str | None = None
    reason: str | None = None
    old_value: dict | None = None
    new_value: dict | None = None
    correlation_id: str | None = None
    created_at: dt.datetime


class EventOut(ApiModel):
    id: str
    event_type: str
    factory_id: str | None = None
    occurred_at: dt.datetime
    status: str
    payload: dict = Field(default_factory=dict)
    correlation_id: str | None = None


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(principal: CurrentPrincipal, db: DbSession,
                       unread_only: bool = False,
                       limit: int = Query(default=50, ge=1, le=200)) -> list[NotificationOut]:
    stmt = select(Notification).where(Notification.user_id == principal.user_id)
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    rows = db.scalars(stmt.order_by(Notification.created_at.desc()).limit(limit)).all()
    return [NotificationOut.model_validate(r) for r in rows]


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: str, principal: CurrentPrincipal,
              db: DbSession) -> NotificationOut:
    row = db.get(Notification, notification_id)
    if row is None or row.user_id != principal.user_id:
        raise NotFound("Notification not found.")
    if row.read_at is None:
        row.read_at = utcnow()
        db.commit()
    return NotificationOut.model_validate(row)


@router.post("/notifications/read-all")
def mark_all_read(principal: CurrentPrincipal, db: DbSession) -> dict[str, int]:
    rows = db.scalars(
        select(Notification).where(
            Notification.user_id == principal.user_id, Notification.read_at.is_(None)
        )
    ).all()
    now = utcnow()
    for row in rows:
        row.read_at = now
    db.commit()
    return {"marked": len(rows)}


@router.get("/factories/{factory_id}/audit", response_model=list[AuditEntryOut])
def factory_audit(factory_id: str, principal: CurrentPrincipal, db: DbSession,
                  limit: int = Query(default=100, ge=1, le=500)) -> list[AuditEntryOut]:
    """The audit trail for one factory's organization.

    Reading the trail goes through the same factory access check as reading the
    data, so an audit log cannot become a side channel into another tenant.
    """
    factory = resolve_factory(db, principal, factory_id)
    rows = db.scalars(
        select(AuditLog).where(AuditLog.organization_id == factory.organization_id)
        .order_by(AuditLog.created_at.desc()).limit(limit)
    ).all()
    return [AuditEntryOut.model_validate(r) for r in rows]


@router.get("/factories/{factory_id}/events", response_model=list[EventOut])
def factory_events(factory_id: str, principal: CurrentPrincipal, db: DbSession,
                   limit: int = Query(default=100, ge=1, le=500)) -> list[EventOut]:
    resolve_factory(db, principal, factory_id)
    rows = db.scalars(
        select(Event).where(Event.factory_id == factory_id)
        .order_by(Event.occurred_at.desc()).limit(limit)
    ).all()
    return [EventOut.model_validate(r) for r in rows]
