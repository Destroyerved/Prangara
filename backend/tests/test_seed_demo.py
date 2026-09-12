"""
The seed command.

task.md section 13: no manual database editing should be required for the demo.
That is only true if a seeded account can actually sign in, which is exactly what
broke once - the seeded addresses used a TLD the email validator rejects, so
every demo account was unusable while the seed reported success.
"""
from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.models.action import Action
from app.models.assessment import Assessment
from app.models.factory import Factory
from app.models.marketplace import Provider, Quote
from scripts.seed_demo import ACCOUNTS, DEMO_PASSWORD, PROVIDERS, _email, seed, wipe


def test_seed_creates_a_working_demo_and_can_remove_it(client: TestClient) -> None:
    with SessionLocal() as db:
        created = seed(db)

    assert len(created) == len(ACCOUNTS) + len(PROVIDERS)

    # Every seeded account must be able to sign in. This is the assertion that
    # would have caught the unusable-address bug.
    for email in created.values():
        response = client.post(
            "/api/auth/login", json={"email": email, "password": DEMO_PASSWORD}
        )
        assert response.status_code == 200, f"{email} cannot sign in: {response.text}"

    owner = client.post(
        "/api/auth/login",
        json={"email": _email("owner"), "password": DEMO_PASSWORD},
    ).json()
    headers = {"Authorization": f"Bearer {owner['access_token']}"}

    factories = client.get("/api/factories", headers=headers).json()
    assert len(factories) == 3
    hero = next(f for f in factories if f["name"] == "Rajkot Metal Works")
    assert hero["total_tco2e"] and hero["total_tco2e"] > 0
    assert hero["latest_assessment_id"]

    actions = client.get(f"/api/factories/{hero['id']}/actions", headers=headers).json()
    assert actions, "the hero factory should have tracked actions"

    rfqs = client.get("/api/rfqs", headers=headers).json()
    assert len(rfqs) >= 1
    quoted_rfq = next(r for r in rfqs if r["status"] == "QUOTED")
    comparison = client.get(f"/api/rfqs/{quoted_rfq['id']}/compare", headers=headers).json()
    assert len(comparison["quotes"]) == 3
    # Quotes are ranked by the payback recomputed at each quoted price.
    paybacks = [q["revised_payback_yrs"] for q in comparison["quotes"]]
    assert paybacks == sorted(paybacks, key=lambda v: v if v is not None else 1e9)

    providers = client.get("/api/providers", headers=headers).json()
    demo_providers = [p for p in providers if p.get("is_demo_seed")]
    assert len(demo_providers) == len(PROVIDERS)
    materials = client.get("/api/materials", headers=headers).json()
    demo_materials = [m for m in materials if m.get("is_demo_seed")]
    assert len(demo_materials) >= 9

    # The consultant reaches exactly the one factory they were granted.
    consultant = client.post(
        "/api/auth/login",
        json={"email": _email("compliance"), "password": DEMO_PASSWORD},
    ).json()
    visible = client.get(
        "/api/factories", headers={"Authorization": f"Bearer {consultant['access_token']}"}
    ).json()
    assert [f["id"] for f in visible] == [hero["id"]]

    # And the whole thing can be removed again, taking only what it created.
    # The assertions are scoped to the seeded ids rather than to empty tables:
    # this suite shares one database, and a seed wipe that emptied every table
    # would be a bug, not a pass.
    seeded_factory_ids = [f["id"] for f in factories]
    with SessionLocal() as db:
        removed = wipe(db)
        assert removed == len(ACCOUNTS) + len(PROVIDERS)
        for model, column in (
            (Factory, Factory.id),
            (Assessment, Assessment.factory_id),
            (Action, Action.factory_id),
        ):
            assert db.scalar(
                select(func.count()).select_from(model).where(column.in_(seeded_factory_ids))
            ) == 0
        assert db.scalar(
            select(func.count()).select_from(Provider).where(Provider.is_demo_seed.is_(True))
        ) == 0
        assert db.scalar(
            select(func.count()).select_from(Quote).where(Quote.is_demo_seed.is_(True))
        ) == 0

    # Signing in again must now fail - the accounts are gone.
    assert client.post(
        "/api/auth/login", json={"email": _email("owner"), "password": DEMO_PASSWORD}
    ).status_code == 401


def test_seed_marketplace_idempotent_multiple_executions() -> None:
    """Verifies that seed and seed_marketplace can be run multiple times safely without errors."""
    from app.models.identity import Organization, User
    from scripts.seed_demo import seed_marketplace

    with SessionLocal() as db:
        wipe(db)
        # First execution
        created1 = seed(db)
        assert len(created1) == len(ACCOUNTS) + len(PROVIDERS)

        # Second execution (idempotent marketplace refresh)
        hero_fac = db.scalar(select(Factory).where(Factory.name == "Rajkot Metal Works"))
        owner_u = db.scalar(select(User).where(User.email == _email("owner")))
        owner_o = db.scalar(select(Organization).where(Organization.name == "Rajkot Metal Works"))
        m_created2 = seed_marketplace(db, hero_fac.id if hero_fac else None, owner_u, owner_o)
        assert len(m_created2) == len(PROVIDERS)

        # Third execution
        m_created3 = seed_marketplace(db, hero_fac.id if hero_fac else None, owner_u, owner_o)
        assert len(m_created3) == len(PROVIDERS)

        # Clean wipe
        removed = wipe(db)
        assert removed == len(ACCOUNTS) + len(PROVIDERS)

