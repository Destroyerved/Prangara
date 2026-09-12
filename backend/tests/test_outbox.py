"""Event outbox and notification fan-out."""
from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.governance import Event, Notification
from app.workers.outbox import process_once
from tests.conftest import register_org


def drain() -> int:
    """Process every pending event, the way the worker loop does."""
    total = 0
    while True:
        handled = process_once()
        total += handled
        if handled == 0:
            return total


def test_assessment_events_become_notifications(client: TestClient) -> None:
    maker = register_org(client, "outbox@example.com", "Outbox Works", "manufacturer")
    headers = maker["headers"]
    factory = client.post("/api/factories", headers=headers, json={
        "name": "Outbox Plant", "sector": "textile_dyeing", "state": "West Bengal",
    }).json()
    client.post(f"/api/intake/factories/{factory['id']}/confirm", headers=headers, json={
        "profile_updates": {"annual_output_t": 900, "annual_revenue_cr": 12},
        "activity_records": [
            {"stream_kind": "electricity", "quantity": 4_000_000, "unit": "kWh"},
            {"stream_kind": "fuel", "factor_key": "COAL_INDIAN", "quantity": 2200,
             "unit": "tonne"},
        ],
    })
    client.post(f"/api/factories/{factory['id']}/assessments", headers=headers, json={})

    with SessionLocal() as db:
        pending = db.scalars(
            select(Event).where(Event.factory_id == factory["id"], Event.status == "PENDING")
        ).all()
        types = {e.event_type for e in pending}
    assert "ASSESSMENT_COMPLETED" in types
    # Compliance evaluation is raised by BE-1 and consumed by BE-2.
    assert "COMPLIANCE_EVALUATION_REQUESTED" in types

    # Drain fully rather than one batch. `process_once` handles up to BATCH_SIZE
    # events, and this suite shares a database, so a single call is not a
    # guarantee that this factory's events were reached.
    assert drain() > 0

    with SessionLocal() as db:
        remaining = db.scalars(
            select(Event).where(Event.factory_id == factory["id"], Event.status == "PENDING")
        ).all()
        assert remaining == []
        unhandled = db.scalar(
            select(Event).where(
                Event.factory_id == factory["id"],
                Event.event_type == "COMPLIANCE_EVALUATION_REQUESTED",
            )
        )
        # An event with no domain handler is marked processed with a note rather
        # than silently dropped, so a missing handler is visible.
        assert unhandled.status == "PROCESSED"
        assert unhandled.last_error == "no domain handler registered"

    notifications = client.get("/api/notifications", headers=headers).json()
    kinds = {n["kind"] for n in notifications}
    assert "CRITICAL_LEAK_DETECTED" in kinds or "ASSESSMENT_COMPLETED" in kinds
    for note in notifications:
        assert note["deep_link"].startswith(f"factory/{factory['id']}/")


def test_notifications_never_cross_tenants(client: TestClient) -> None:
    maker = register_org(client, "tenant-a@example.com", "Tenant A", "manufacturer")
    other = register_org(client, "tenant-b@example.com", "Tenant B", "manufacturer")
    factory = client.post("/api/factories", headers=maker["headers"], json={
        "name": "A Plant", "sector": "foundry_casting",
    }).json()
    client.post(f"/api/intake/factories/{factory['id']}/confirm",
                headers=maker["headers"], json={
                    "profile_updates": {"annual_output_t": 500},
                    "activity_records": [
                        {"stream_kind": "electricity", "quantity": 900_000, "unit": "kWh"},
                    ],
                })
    client.post(f"/api/factories/{factory['id']}/assessments",
                headers=maker["headers"], json={})
    drain()

    assert client.get("/api/notifications", headers=other["headers"]).json() == []
    with SessionLocal() as db:
        leaked = db.scalars(
            select(Notification).where(Notification.factory_id == factory["id"])
        ).all()
        assert leaked, "the owner should have been notified"
