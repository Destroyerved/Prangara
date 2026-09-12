"""
Tenant isolation and RBAC.

These are the tests that matter most for a multi-tenant platform, because every
other feature is a liability if one of them fails. They assert the rules FR-01
states: organizations cannot see each other's factories, a provider cannot reach
a manufacturer's assessment, and a delegated factory grant gives exactly one
factory and no more.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import register_org


def _factory_with_data(client: TestClient, headers: dict, name: str,
                       sector: str = "textile_dyeing") -> dict:
    factory = client.post("/api/factories", headers=headers, json={
        "name": name, "sector": sector, "state": "Gujarat",
    }).json()
    client.post(f"/api/intake/factories/{factory['id']}/confirm", headers=headers, json={
        "profile_updates": {"annual_output_t": 1800, "annual_revenue_cr": 24},
        "activity_records": [
            {"stream_kind": "electricity", "quantity": 1_500_000, "unit": "kWh"},
            {"stream_kind": "fuel", "factor_key": "COAL_INDIAN", "quantity": 700,
             "unit": "tonne"},
        ],
    })
    return factory


def test_organizations_cannot_see_each_others_factories(client: TestClient) -> None:
    alice = register_org(client, "alice@iso.example", "Alice Textiles", "manufacturer")
    bob = register_org(client, "bob@iso.example", "Bob Textiles", "manufacturer")

    factory = _factory_with_data(client, alice["headers"], "Alice Plant")
    assessment = client.post(f"/api/factories/{factory['id']}/assessments",
                             headers=alice["headers"], json={}).json()

    # Bob's list is empty, and direct ids are 404 - not 403, which would confirm
    # the object exists.
    assert client.get("/api/factories", headers=bob["headers"]).json() == []
    assert client.get(f"/api/factories/{factory['id']}",
                      headers=bob["headers"]).status_code == 404
    assert client.get(f"/api/assessments/{assessment['id']}",
                      headers=bob["headers"]).status_code == 404
    assert client.post(f"/api/factories/{factory['id']}/assessments",
                       headers=bob["headers"], json={}).status_code == 404
    assert client.get(f"/api/factories/{factory['id']}/audit",
                      headers=bob["headers"]).status_code == 404
    assert client.get(f"/api/factories/{factory['id']}/activity",
                      headers=bob["headers"]).status_code == 404


def test_provider_cannot_reach_manufacturer_data(client: TestClient) -> None:
    maker = register_org(client, "maker@prov.example", "Maker Works", "manufacturer")
    vendor = register_org(client, "vendor@prov.example", "Vendor Co", "provider")
    client.post("/api/providers", headers=vendor["headers"], json={
        "name": "Vendor Co", "provider_type": "esco", "state": "Gujarat",
    })

    factory = _factory_with_data(client, maker["headers"], "Maker Plant")
    assessment = client.post(f"/api/factories/{factory['id']}/assessments",
                             headers=maker["headers"], json={}).json()

    assert client.get(f"/api/factories/{factory['id']}",
                      headers=vendor["headers"]).status_code == 404
    assert client.get(f"/api/assessments/{assessment['id']}",
                      headers=vendor["headers"]).status_code == 404
    assert client.get("/api/factories", headers=vendor["headers"]).json() == []
    # A provider's RFQ list is empty until somebody invites them.
    assert client.get("/api/rfqs", headers=vendor["headers"]).json() == []


def test_provider_cannot_quote_an_rfq_it_was_not_invited_to(client: TestClient) -> None:
    maker = register_org(client, "maker2@prov.example", "Maker Two", "manufacturer")
    invited = register_org(client, "invited@prov.example", "Invited Co", "provider")
    outsider = register_org(client, "outsider@prov.example", "Outsider Co", "provider")
    invited_provider = client.post("/api/providers", headers=invited["headers"], json={
        "name": "Invited Co", "provider_type": "esco",
    }).json()
    client.post("/api/providers", headers=outsider["headers"], json={
        "name": "Outsider Co", "provider_type": "esco",
    })

    factory = _factory_with_data(client, maker["headers"], "Maker Two Plant")
    rfq = client.post("/api/rfqs", headers=maker["headers"], json={
        "factory_id": factory["id"], "intervention_id": "VFD_RETROFIT",
        "title": "VFD work", "provider_ids": [invited_provider["id"]],
    }).json()

    assert client.get(f"/api/rfqs/{rfq['id']}", headers=outsider["headers"]).status_code == 404
    assert client.post(f"/api/rfqs/{rfq['id']}/quotes", headers=outsider["headers"],
                       json={"price_inr": 1}).status_code == 404
    assert client.get(f"/api/rfqs/{rfq['id']}", headers=invited["headers"]).status_code == 200


def test_non_provider_cannot_register_a_provider_profile(client: TestClient) -> None:
    maker = register_org(client, "notprovider@example.com", "Just A Factory", "manufacturer")
    response = client.post("/api/providers", headers=maker["headers"], json={
        "name": "Sneaky", "provider_type": "esco",
    })
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "not_a_provider_org"


def test_provider_verification_is_admin_only(client: TestClient) -> None:
    vendor = register_org(client, "unverified@example.com", "Unverified Co", "provider")
    provider = client.post("/api/providers", headers=vendor["headers"], json={
        "name": "Unverified Co", "provider_type": "recycler",
    }).json()
    assert provider["verification_status"] == "unverified"
    # A provider cannot mark itself verified.
    assert client.post(f"/api/providers/{provider['id']}/verify",
                       headers=vendor["headers"]).status_code == 403


def test_evidence_is_scoped_to_its_factory(client: TestClient) -> None:
    import io

    owner = register_org(client, "evowner@example.com", "Evidence Owner", "manufacturer")
    stranger = register_org(client, "evstranger@example.com", "Stranger", "manufacturer")
    factory = _factory_with_data(client, owner["headers"], "Evidence Plant")

    evidence = client.post(
        "/api/evidence", headers=owner["headers"],
        files={"file": ("bill.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
        data={"factory_id": factory["id"], "evidence_type": "electricity_bill"},
    ).json()

    assert client.get(f"/api/evidence/{evidence['id']}",
                      headers=stranger["headers"]).status_code == 404
    assert client.get(f"/api/evidence/{evidence['id']}/download",
                      headers=stranger["headers"]).status_code == 404
    assert client.get(f"/api/evidence/{evidence['id']}/download",
                      headers=owner["headers"]).status_code == 200


def test_unsupported_upload_type_is_rejected(client: TestClient) -> None:
    import io

    owner = register_org(client, "exe@example.com", "Exe Uploader", "manufacturer")
    factory = _factory_with_data(client, owner["headers"], "Exe Plant")
    response = client.post(
        "/api/evidence", headers=owner["headers"],
        files={"file": ("payload.exe", io.BytesIO(b"MZ"), "application/x-msdownload")},
        data={"factory_id": factory["id"], "evidence_type": "other"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "unsupported_file_type"


def test_duplicate_evidence_is_reported_not_silently_merged(client: TestClient) -> None:
    import io

    owner = register_org(client, "dupe@example.com", "Dupe Co", "manufacturer")
    factory = _factory_with_data(client, owner["headers"], "Dupe Plant")
    payload = b"%PDF-1.4 the same bytes twice"

    first = client.post(
        "/api/evidence", headers=owner["headers"],
        files={"file": ("bill.pdf", io.BytesIO(payload), "application/pdf")},
        data={"factory_id": factory["id"], "evidence_type": "electricity_bill"},
    )
    assert first.status_code == 201
    second = client.post(
        "/api/evidence", headers=owner["headers"],
        files={"file": ("bill-copy.pdf", io.BytesIO(payload), "application/pdf")},
        data={"factory_id": factory["id"], "evidence_type": "electricity_bill"},
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "duplicate_evidence"
    assert second.json()["error"]["details"]["existing_evidence_id"] == first.json()["id"]


def test_refresh_token_rotates_and_old_one_dies(client: TestClient) -> None:
    user = register_org(client, "rotate@example.com", "Rotate Co", "manufacturer")
    first = client.post("/api/auth/refresh", json={"refresh_token": user["refresh_token"]})
    assert first.status_code == 200
    rotated = first.json()["refresh_token"]
    assert rotated != user["refresh_token"]
    # Replaying the burned token fails, which is how a stolen token surfaces.
    assert client.post("/api/auth/refresh",
                       json={"refresh_token": user["refresh_token"]}).status_code == 401
    assert client.post("/api/auth/refresh",
                       json={"refresh_token": rotated}).status_code == 200


def test_login_does_not_reveal_whether_an_account_exists(client: TestClient) -> None:
    register_org(client, "known@example.com", "Known Co", "manufacturer")
    missing = client.post("/api/auth/login",
                          json={"email": "nobody@example.com", "password": "whatever12"})
    wrong = client.post("/api/auth/login",
                        json={"email": "known@example.com", "password": "wrongpassword"})
    assert missing.status_code == wrong.status_code == 401
    assert missing.json()["error"] == wrong.json()["error"]


def test_delegated_factory_grant_gives_exactly_one_factory(client: TestClient) -> None:
    from sqlalchemy import select

    from app.core.database import SessionLocal
    from app.models.factory import Factory
    from app.models.identity import FactoryAccess, User

    owner = register_org(client, "grantor@example.com", "Grantor Co", "manufacturer")
    consultant = register_org(client, "consultant@example.com", "Consultancy", "consultant")
    granted = _factory_with_data(client, owner["headers"], "Granted Plant")
    withheld = _factory_with_data(client, owner["headers"], "Withheld Plant")

    # The grant API is a Phase 2 item; the access rule it will use is enforced
    # now, so the row is written directly and the rule is tested today.
    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == "consultant@example.com"))
        session.add(FactoryAccess(user_id=user.id, factory_id=granted["id"], level="read"))
        session.commit()

    assert client.get(f"/api/factories/{granted['id']}",
                      headers=consultant["headers"]).status_code == 200
    assert client.get(f"/api/factories/{withheld['id']}",
                      headers=consultant["headers"]).status_code == 404
    listed = client.get("/api/factories", headers=consultant["headers"]).json()
    assert [f["id"] for f in listed] == [granted["id"]]
    # Read-level access cannot write.
    assert client.post(f"/api/factories/{granted['id']}/assessments",
                       headers=consultant["headers"], json={}).status_code == 403


def test_blocked_intervention_cannot_be_revived_without_a_reason(client: TestClient) -> None:
    maker = register_org(client, "pharma@example.com", "Pharma Co", "manufacturer")
    headers = maker["headers"]
    factory = client.post("/api/factories", headers=headers, json={
        "name": "Pharma Plant", "sector": "pharma_formulation", "state": "Gujarat",
    }).json()
    client.post(f"/api/intake/factories/{factory['id']}/confirm", headers=headers, json={
        "profile_updates": {"annual_output_t": 900, "annual_revenue_cr": 40},
        "activity_records": [
            {"stream_kind": "electricity", "quantity": 2_000_000, "unit": "kWh"},
            {"stream_kind": "material", "factor_key": "PET_VIRGIN", "quantity": 300,
             "unit": "tonne"},
        ],
    })
    client.post(f"/api/factories/{factory['id']}/assessments", headers=headers, json={})

    actions = client.get(f"/api/factories/{factory['id']}/actions", headers=headers).json()
    blocked = next(a for a in actions if a["was_blocked"])
    assert "GMP" in (blocked["restriction_note"] or "")

    refused = client.patch(f"/api/actions/{blocked['id']}", headers=headers,
                           json={"status": "SELECTED"})
    assert refused.status_code == 400
    assert refused.json()["error"]["code"] == "blocked_override_needs_reason"

    # With a recorded reason the override is allowed, and the reason is kept.
    allowed = client.patch(f"/api/actions/{blocked['id']}", headers=headers, json={
        "status": "SELECTED",
        "notes": "Secondary packaging only; change control raised under CC-2026-114.",
    })
    assert allowed.status_code == 200
    assert allowed.json()["restriction_note"]
