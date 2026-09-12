"""
Membership and delegated factory access.

`test_access_control.py` proves the access *rules* hold. These prove the
management API that creates and revokes them cannot be used to get around those
rules — a consultant cannot pass on a grant, a provider cannot be given one, and
removing the last owner is refused because it would orphan every factory.
"""
from __future__ import annotations

import datetime as dt

from fastapi.testclient import TestClient

from tests.conftest import register_org


def _factory(client: TestClient, headers: dict, name: str) -> dict:
    factory = client.post("/api/factories", headers=headers, json={
        "name": name, "sector": "textile_dyeing", "state": "Gujarat",
    }).json()
    client.post(f"/api/intake/factories/{factory['id']}/confirm", headers=headers, json={
        "profile_updates": {"annual_output_t": 1200},
        "activity_records": [
            {"stream_kind": "electricity", "quantity": 900_000, "unit": "kWh"},
        ],
    })
    return factory


def _org_id(client: TestClient, headers: dict) -> str:
    return client.get("/api/auth/me", headers=headers).json()["active_organization_id"]


def test_invite_creates_an_account_and_shows_the_password_once(client: TestClient) -> None:
    owner = register_org(client, "inviteowner@example.com", "Invite Co", "manufacturer")
    org_id = _org_id(client, owner["headers"])

    response = client.post(f"/api/organizations/{org_id}/members",
                           headers=owner["headers"], json={
                               "email": "newhire@example.com",
                               "full_name": "New Hire", "role": "member",
                           })
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["created_account"] is True
    assert body["temporary_password"]
    assert "sends no email" in body["delivery_note"]

    # The new account can actually sign in with what was handed back.
    signed_in = client.post("/api/auth/login", json={
        "email": "newhire@example.com", "password": body["temporary_password"],
    })
    assert signed_in.status_code == 200

    members = client.get(f"/api/organizations/{org_id}/members",
                         headers=owner["headers"]).json()
    assert {m["user"]["email"] for m in members} == {
        "inviteowner@example.com", "newhire@example.com",
    }


def test_inviting_an_existing_person_does_not_reset_their_password(
    client: TestClient,
) -> None:
    owner = register_org(client, "inv2owner@example.com", "Invite Two Co", "manufacturer")
    existing = register_org(client, "existing@example.com", "Their Own Co", "manufacturer")
    org_id = _org_id(client, owner["headers"])

    body = client.post(f"/api/organizations/{org_id}/members",
                       headers=owner["headers"],
                       json={"email": "existing@example.com", "role": "member"}).json()
    assert body["created_account"] is False
    assert body["temporary_password"] is None

    # Their original credentials still work.
    assert client.post("/api/auth/login", json={
        "email": "existing@example.com", "password": "correct-horse-battery",
    }).status_code == 200
    # And they now hold two memberships.
    me = client.get("/api/auth/me", headers=existing["headers"]).json()
    assert len(me["memberships"]) == 2


def test_a_member_cannot_invite(client: TestClient) -> None:
    owner = register_org(client, "roleowner@example.com", "Role Co", "manufacturer")
    org_id = _org_id(client, owner["headers"])
    invited = client.post(f"/api/organizations/{org_id}/members",
                          headers=owner["headers"], json={
                              "email": "plain@example.com", "role": "viewer",
                          }).json()

    plain = client.post("/api/auth/login", json={
        "email": "plain@example.com", "password": invited["temporary_password"],
    }).json()
    headers = {"Authorization": f"Bearer {plain['access_token']}"}

    response = client.post(f"/api/organizations/{org_id}/members", headers=headers,
                           json={"email": "another@example.com", "role": "member"})
    assert response.status_code == 403


def test_platform_admin_role_cannot_be_self_granted(client: TestClient) -> None:
    owner = register_org(client, "escalate@example.com", "Escalate Co", "manufacturer")
    org_id = _org_id(client, owner["headers"])
    response = client.post(f"/api/organizations/{org_id}/members",
                           headers=owner["headers"], json={
                               "email": "admin-wannabe@example.com",
                               "role": "platform_admin",
                           })
    assert response.status_code == 403


def test_the_last_owner_cannot_be_removed(client: TestClient) -> None:
    owner = register_org(client, "lastowner@example.com", "Last Owner Co", "manufacturer")
    org_id = _org_id(client, owner["headers"])
    me = client.get("/api/auth/me", headers=owner["headers"]).json()

    response = client.delete(f"/api/organizations/{org_id}/members/{me['user']['id']}",
                             headers=owner["headers"])
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "last_owner"


def test_grant_gives_one_factory_and_can_be_revoked(client: TestClient) -> None:
    owner = register_org(client, "grantowner@example.com", "Grant Co", "manufacturer")
    consultant = register_org(client, "grantconsultant@example.com", "Consultancy",
                              "consultant")
    granted = _factory(client, owner["headers"], "Granted Plant")
    withheld = _factory(client, owner["headers"], "Withheld Plant")

    response = client.post(f"/api/factories/{granted['id']}/access",
                           headers=owner["headers"], json={
                               "email": "grantconsultant@example.com", "level": "read",
                           })
    assert response.status_code == 201, response.text
    grant = response.json()

    assert client.get(f"/api/factories/{granted['id']}",
                      headers=consultant["headers"]).status_code == 200
    assert client.get(f"/api/factories/{withheld['id']}",
                      headers=consultant["headers"]).status_code == 404
    # Read level cannot write.
    assert client.post(f"/api/factories/{granted['id']}/assessments",
                       headers=consultant["headers"], json={}).status_code == 403

    # A consultant holding a grant cannot pass it on.
    onward = client.post(f"/api/factories/{granted['id']}/access",
                         headers=consultant["headers"], json={
                             "email": "someone-else@example.com", "level": "read",
                         })
    assert onward.status_code == 403

    revoked = client.delete(f"/api/factories/{granted['id']}/access/{grant['id']}",
                            headers=owner["headers"], params={"reason": "engagement ended"})
    assert revoked.status_code == 200
    assert client.get(f"/api/factories/{granted['id']}",
                      headers=consultant["headers"]).status_code == 404

    # The grant is revoked, not erased - who had access and when is audit data.
    grants = client.get(f"/api/factories/{granted['id']}/access",
                        headers=owner["headers"]).json()
    assert len(grants) == 1 and grants[0]["revoked_at"]

    trail = client.get(f"/api/factories/{granted['id']}/audit",
                       headers=owner["headers"]).json()
    assert {"factory.access.grant", "factory.access.revoke"} <= {a["action"] for a in trail}


def test_an_expired_grant_stops_working(client: TestClient) -> None:
    owner = register_org(client, "expiryowner@example.com", "Expiry Co", "manufacturer")
    consultant = register_org(client, "expiryconsultant@example.com", "Expiry Advisors",
                              "consultant")
    factory = _factory(client, owner["headers"], "Expiring Plant")

    past = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)).isoformat()
    client.post(f"/api/factories/{factory['id']}/access", headers=owner["headers"], json={
        "email": "expiryconsultant@example.com", "level": "read", "expires_at": past,
    })
    assert client.get(f"/api/factories/{factory['id']}",
                      headers=consultant["headers"]).status_code == 404
    assert client.get("/api/factories", headers=consultant["headers"]).json() == []


def test_a_provider_can_never_hold_a_factory_grant(client: TestClient) -> None:
    """FR-01's hard rule, enforced at the point a grant is created."""
    owner = register_org(client, "provgrantowner@example.com", "Prov Grant Co",
                         "manufacturer")
    vendor = register_org(client, "provgrantvendor@example.com", "Vendor Co", "provider")
    client.post("/api/providers", headers=vendor["headers"], json={
        "name": "Vendor Co", "provider_type": "esco",
    })
    factory = _factory(client, owner["headers"], "No Provider Plant")

    response = client.post(f"/api/factories/{factory['id']}/access",
                           headers=owner["headers"], json={
                               "email": "provgrantvendor@example.com", "level": "read",
                           })
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "provider_cannot_hold_grant"


def test_grant_needs_a_real_account(client: TestClient) -> None:
    owner = register_org(client, "ghostgrant@example.com", "Ghost Grant Co", "manufacturer")
    factory = _factory(client, owner["headers"], "Ghost Plant")
    response = client.post(f"/api/factories/{factory['id']}/access",
                           headers=owner["headers"], json={
                               "email": "nobody-here@example.com", "level": "read",
                           })
    assert response.status_code == 404
