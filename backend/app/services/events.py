"""
Event outbox. DATA_RAG_COMPLIANCE sections 25 to 27.

`emit` adds a PENDING row to the same session as the business change, so the
event and the change commit or roll back together. A worker
(`app/workers/outbox.py`) then picks pending rows up and runs handlers.

BE-1 owns this transport. BE-2 owns the compliance handlers that consume it, so
handlers are registered by name rather than imported here - a missing handler
leaves the event PENDING and visible, instead of silently discarding it.
"""
from __future__ import annotations

from typing import Any, Callable

from sqlalchemy.orm import Session

from app.models.base import utcnow
from app.models.governance import Event

# --- event type constants -------------------------------------------------
# Factory / data
FACTORY_CREATED = "FACTORY_CREATED"
FACTORY_PROFILE_UPDATED = "FACTORY_PROFILE_UPDATED"
ACTIVITY_RECORD_ADDED = "ACTIVITY_RECORD_ADDED"
ACTIVITY_RECORD_CORRECTED = "ACTIVITY_RECORD_CORRECTED"
ASSET_REGISTERED = "ASSET_REGISTERED"
EVIDENCE_UPLOADED = "EVIDENCE_UPLOADED"
EVIDENCE_VERIFIED = "EVIDENCE_VERIFIED"
EVIDENCE_EXPIRING = "EVIDENCE_EXPIRING"
EVIDENCE_EXPIRED = "EVIDENCE_EXPIRED"

# Carbon
ASSESSMENT_COMPLETED = "ASSESSMENT_COMPLETED"
FOOTPRINT_INCREASED = "FOOTPRINT_INCREASED"
DATA_QUALITY_LOW = "DATA_QUALITY_LOW"
CRITICAL_LEAK_DETECTED = "CRITICAL_LEAK_DETECTED"
BENCHMARK_POSITION_WORSENED = "BENCHMARK_POSITION_WORSENED"

# Actions
RECOMMENDATION_SELECTED = "RECOMMENDATION_SELECTED"
RFQ_CREATED = "RFQ_CREATED"
QUOTE_ACCEPTED = "QUOTE_ACCEPTED"
ACTION_IMPLEMENTATION_STARTED = "ACTION_IMPLEMENTATION_STARTED"
ACTION_IMPLEMENTATION_COMPLETED = "ACTION_IMPLEMENTATION_COMPLETED"
VERIFICATION_COMPLETED = "VERIFICATION_COMPLETED"
VERIFICATION_UNDERPERFORMED = "VERIFICATION_UNDERPERFORMED"

# Compliance (rows written here, verdicts decided by BE-2)
COMPLIANCE_EVALUATION_REQUESTED = "COMPLIANCE_EVALUATION_REQUESTED"
COMPLIANCE_CASE_CREATED = "COMPLIANCE_CASE_CREATED"
CORRECTIVE_ACTION_CREATED = "CORRECTIVE_ACTION_CREATED"
CORRECTIVE_ACTION_DUE = "CORRECTIVE_ACTION_DUE"
CORRECTIVE_ACTION_OVERDUE = "CORRECTIVE_ACTION_OVERDUE"
COMPLIANCE_CASE_CLOSED = "COMPLIANCE_CASE_CLOSED"

# Marketplace
NEW_PROVIDER_MATCH = "NEW_PROVIDER_MATCH"
NEW_QUOTE = "NEW_QUOTE"

Handler = Callable[[Session, Event], None]
_HANDLERS: dict[str, list[Handler]] = {}


def register(event_type: str, handler: Handler) -> None:
    """Attach a handler. Several handlers per type are allowed and run in order."""
    _HANDLERS.setdefault(event_type, []).append(handler)


def handlers_for(event_type: str) -> list[Handler]:
    return list(_HANDLERS.get(event_type, ()))


def emit(db: Session, event_type: str, *, organization_id: str | None = None,
         factory_id: str | None = None, actor_user_id: str | None = None,
         payload: dict[str, Any] | None = None, evidence_ids: list[str] | None = None,
         correlation_id: str | None = None, source: str = "platform") -> Event:
    """Queue an event. Caller commits; this never commits on its own."""
    event = Event(
        event_type=event_type,
        organization_id=organization_id,
        factory_id=factory_id,
        actor_user_id=actor_user_id,
        source=source,
        occurred_at=utcnow(),
        payload=payload or {},
        evidence_ids=evidence_ids or [],
        correlation_id=correlation_id,
        status="PENDING",
    )
    db.add(event)
    return event
