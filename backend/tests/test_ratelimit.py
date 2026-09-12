"""
Authentication rate limiting. PRD section 28.

Switched on explicitly here — the rest of the suite registers dozens of
organizations from one client address, which is the behaviour the limiter
exists to refuse.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core import ratelimit
from tests.conftest import register_org


@pytest.fixture()
def limited(monkeypatch):
    """Turn the limiter on with small budgets, and reset counters around the test."""
    ratelimit.reset()
    monkeypatch.setattr(ratelimit, "ENABLED", True)
    monkeypatch.setattr(ratelimit, "LOGIN_PER_ACCOUNT", 3)
    monkeypatch.setattr(ratelimit, "LOGIN_PER_IP", 100)
    monkeypatch.setattr(ratelimit, "REGISTER_PER_IP", 2)
    yield
    ratelimit.reset()


def test_password_guessing_is_stopped_per_account(client: TestClient, limited) -> None:
    register_org(client, "victim@example.com", "Victim Co", "manufacturer")

    for attempt in range(3):
        response = client.post("/api/auth/login", json={
            "email": "victim@example.com", "password": f"guess-{attempt}",
        })
        assert response.status_code == 401, f"attempt {attempt} should be a plain refusal"

    blocked = client.post("/api/auth/login", json={
        "email": "victim@example.com", "password": "guess-4",
    })
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "rate_limited"
    assert int(blocked.headers["Retry-After"]) > 0

    # The budget is attached to the account, so even the right password is
    # refused while it is exhausted. That is the point: an attacker cannot tell
    # a correct guess from an incorrect one once the limit is hit.
    correct = client.post("/api/auth/login", json={
        "email": "victim@example.com", "password": "correct-horse-battery",
    })
    assert correct.status_code == 429

    # Another account is unaffected - one user's attack does not lock out the rest.
    register_org(client, "bystander@example.com", "Bystander Co", "manufacturer")
    ratelimit.reset()
    assert client.post("/api/auth/login", json={
        "email": "bystander@example.com", "password": "correct-horse-battery",
    }).status_code == 200


def test_registration_is_capped_per_address(client: TestClient, limited) -> None:
    for index in range(2):
        response = client.post("/api/auth/register", json={
            "email": f"burst-{index}@example.com", "password": "correct-horse-battery",
            "full_name": "Burst", "organization_name": "Burst Co",
        })
        assert response.status_code == 201

    blocked = client.post("/api/auth/register", json={
        "email": "burst-3@example.com", "password": "correct-horse-battery",
        "full_name": "Burst", "organization_name": "Burst Co",
    })
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_limiter_is_off_by_default_in_this_suite(client: TestClient) -> None:
    """Guards the fixture above: without it, the rest of the suite would 429."""
    assert ratelimit.ENABLED is False
    for index in range(12):
        response = client.post("/api/auth/login", json={
            "email": "nobody-at-all@example.com", "password": f"x{index}",
        })
        assert response.status_code == 401
