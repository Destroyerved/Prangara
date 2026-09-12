"""
Turning events into notifications. PRD FR-54.

Only events a person can act on become notifications. An assessment finishing
is worth telling someone about; every activity record added is not, and a
notification centre that fills with noise gets ignored, which costs more than
sending nothing.

Recipients are the members of the factory's organization plus anyone holding a
live grant on that factory. Nobody outside that set is ever notified, so the
notification centre cannot become a way to learn that another tenant exists.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.base import as_utc, utcnow
from app.models.factory import Factory
from app.models.governance import Event, Notification
from app.models.identity import FactoryAccess, Membership

# event type -> (severity, title template, deep link template)
_RULES: dict[str, tuple[str, str, str]] = {
    "ASSESSMENT_COMPLETED": ("info", "Assessment complete", "factory/{factory_id}/footprint"),
    "CRITICAL_LEAK_DETECTED": ("critical", "Critical leak point found",
                               "factory/{factory_id}/leaks"),
    "DATA_QUALITY_LOW": ("warning", "Data quality is low", "factory/{factory_id}/data"),
    "FOOTPRINT_INCREASED": ("warning", "Footprint has increased",
                            "factory/{factory_id}/footprint"),
    "EVIDENCE_EXPIRING": ("warning", "Evidence is about to expire",
                          "factory/{factory_id}/evidence"),
    "EVIDENCE_EXPIRED": ("warning", "Evidence has expired", "factory/{factory_id}/evidence"),
    "NEW_QUOTE": ("info", "New quote received", "factory/{factory_id}/rfqs"),
    "QUOTE_ACCEPTED": ("info", "Quote accepted", "factory/{factory_id}/rfqs"),
    "RFQ_CREATED": ("info", "Quote request sent", "factory/{factory_id}/rfqs"),
    "COMPLIANCE_CASE_CREATED": ("warning", "Compliance case opened",
                                "factory/{factory_id}/compliance"),
    "CORRECTIVE_ACTION_DUE": ("warning", "Corrective action due",
                              "factory/{factory_id}/compliance"),
    "CORRECTIVE_ACTION_OVERDUE": ("critical", "Corrective action overdue",
                                  "factory/{factory_id}/compliance"),
    "VERIFICATION_UNDERPERFORMED": ("warning", "Verified saving fell short of the estimate",
                                    "factory/{factory_id}/actions"),
    "VERIFICATION_COMPLETED": ("info", "Saving verified", "factory/{factory_id}/actions"),
    "ACTION_IMPLEMENTATION_COMPLETED": ("info", "Action marked complete",
                                        "factory/{factory_id}/actions"),
}


def _body(event: Event, factory_name: str | None) -> str:
    payload: dict[str, Any] = event.payload or {}
    where = factory_name or "your factory"

    if event.event_type == "ASSESSMENT_COMPLETED":
        total = payload.get("total_tco2e")
        return (f"{where}: {total:,.0f} tCO2e a year across Scope 1, 2 and 3."
                if total else f"{where}: assessment finished.")
    if event.event_type == "CRITICAL_LEAK_DETECTED":
        return (f"{where}: {payload.get('label', 'a stream')} is "
                f"{payload.get('share_pct', 0):.0f} percent of the footprint "
                f"({payload.get('tco2e', 0):,.0f} tCO2e).")
    if event.event_type == "DATA_QUALITY_LOW":
        return (f"{where}: data quality scored {payload.get('score', 0):.0f} out of 100. "
                "Missing: " + ", ".join(payload.get("gaps", [])[:4]) + ".")
    if event.event_type == "FOOTPRINT_INCREASED":
        return f"{where}: up {payload.get('change_pct', 0):.1f} percent on the previous period."
    if event.event_type == "NEW_QUOTE":
        return (f"{payload.get('provider_name', 'A provider')} quoted "
                f"Rs {payload.get('price_inr', 0):,.0f}.")
    if event.event_type == "VERIFICATION_UNDERPERFORMED":
        return (f"Measured saving reached {payload.get('achievement_pct', 0):.0f} percent of "
                "what was expected. Worth reviewing the assumptions.")
    if event.event_type == "VERIFICATION_COMPLETED":
        return f"Measured saving reached {payload.get('achievement_pct', 0):.0f} percent of estimate."
    return f"{where}: {event.event_type.replace('_', ' ').lower()}."


def recipients(db: Session, event: Event) -> list[str]:
    """User ids entitled to see this event."""
    if not event.organization_id and not event.factory_id:
        return []

    user_ids: set[str] = set()
    if event.organization_id:
        user_ids.update(
            db.scalars(
                select(Membership.user_id).where(
                    Membership.organization_id == event.organization_id
                )
            ).all()
        )
    if event.factory_id:
        now = utcnow()
        grants = db.scalars(
            select(FactoryAccess).where(
                FactoryAccess.factory_id == event.factory_id,
                FactoryAccess.revoked_at.is_(None),
            )
        ).all()
        user_ids.update(
            g.user_id for g in grants
            if g.expires_at is None or (as_utc(g.expires_at) or now) > now
        )
    return sorted(user_ids)


def fan_out(db: Session, event: Event) -> int:
    """Create notifications for one event. Caller commits. Returns how many."""
    rule = _RULES.get(event.event_type)
    if rule is None:
        return 0
    severity, title, link = rule

    factory_name = None
    if event.factory_id:
        factory = db.get(Factory, event.factory_id)
        factory_name = factory.name if factory else None

    body = _body(event, factory_name)
    deep_link = link.format(factory_id=event.factory_id or "")
    now = utcnow()

    created = 0
    for user_id in recipients(db, event):
        # The person who caused the event does not need telling about it.
        if user_id == event.actor_user_id and severity == "info":
            continue
        db.add(Notification(
            user_id=user_id,
            organization_id=event.organization_id,
            factory_id=event.factory_id,
            event_id=event.id,
            kind=event.event_type,
            severity=severity,
            title=title,
            body=body,
            deep_link=deep_link,
            created_at=now,
        ))
        created += 1
    return created
