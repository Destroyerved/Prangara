"""
Test fixtures.

Every test runs against its own throwaway SQLite file, created before the app
imports its settings, so tests can never touch a development database.
"""
from __future__ import annotations

import os
import sys
import tempfile

import pytest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _ROOT)

_TMP = tempfile.mkdtemp(prefix="prangara-test-")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-secret-not-used-anywhere-real")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_TMP, 'test.db')}"
os.environ["STORAGE_LOCAL_DIR"] = os.path.join(_TMP, "evidence")

from fastapi.testclient import TestClient  # noqa: E402

from app import models as _models  # noqa: E402,F401  - registers every table
from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

# `import app.models` would rebind the name `app` to the package and shadow the
# FastAPI instance imported above, so the alias form is load-bearing.


@pytest.fixture(scope="session", autouse=True)
def _schema():
    # create_all rather than Alembic: the migration is verified separately, and
    # a test suite that re-runs every migration for every session is slow
    # without testing anything the models do not already assert.
    Base.metadata.create_all(engine)
    yield
    # No drop_all. The database is a file in a fresh temp directory, and
    # dropping tables with foreign keys enabled fails on SQLite where the
    # assessments/scenarios cycle is concerned. Throwing the file away is both
    # simpler and a stronger guarantee of isolation.
    engine.dispose()


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def manufacturer(client: TestClient) -> dict:
    """A registered manufacturer with a factory, profile and activity data."""
    return register_org(client, "owner@surat-dye.example", "Surat Dyeing Works", "manufacturer")


def register_org(client: TestClient, email: str, org_name: str, kind: str) -> dict:
    response = client.post("/api/auth/register", json={
        "email": email, "password": "correct-horse-battery", "full_name": "Test User",
        "organization_name": org_name, "organization_kind": kind,
    })
    assert response.status_code == 201, response.text
    tokens = response.json()
    return {
        "email": email,
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "headers": {"Authorization": f"Bearer {tokens['access_token']}"},
    }
