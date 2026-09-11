"""
Full-stack tests.

Runs against a throwaway SQLite file so it never touches the working database.
The environment variable must be set before `db` is imported, hence the ordering
at the top of this module.
"""
from __future__ import annotations

import os
import sys
import tempfile

_TMP = os.path.join(tempfile.mkdtemp(prefix="chakra_test_"), "test.db")
os.environ["CHAKRA_DB"] = _TMP
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app as app_mod  # noqa: E402
import benchmarks as bm  # noqa: E402
import db  # noqa: E402
from engine.leaks import sector_db  # noqa: E402

DEMO = sector_db().get("textile_dyeing")["demo_profile"]


def profile(**over):
    p = dict(DEMO)
    p["sector"] = "textile_dyeing"
    p.update(over)
    return p


@pytest.fixture()
def c():
    return TestClient(app_mod.app)


def signup(client, email, org="Acme", kind="plant"):
    r = client.post("/api/auth/register", json={
        "email": email, "password": "correct-horse-1", "name": "Test User",
        "org_name": org, "org_kind": kind})
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------------------
# anonymous surface
# ---------------------------------------------------------------------------

def test_sandbox_is_stateless_and_open(c):
    before = c.get("/api/health").json()["assessments"]
    r = c.post("/api/assess", json=profile())
    assert r.status_code == 200
    assert r.json()["footprint"]["total_tco2e"] > 0
    after = c.get("/api/health").json()["assessments"]
    assert before == after, "the anonymous sandbox must not persist anything"


def test_demo_endpoint_needs_no_auth(c):
    r = c.get("/api/demo/foundry_casting")
    assert r.status_code == 200
    assert r.json()["recommendations"]["count"] > 0


def test_protected_routes_reject_anonymous(c):
    assert c.get("/api/plants").status_code == 401
    assert c.get("/api/portfolio").status_code == 401
    assert c.post("/api/plants",
                  json={"name": "x", "sector": "textile_dyeing"}).status_code == 401
    assert c.get("/api/plants/plt_nonexistent").status_code == 401


# ---------------------------------------------------------------------------
# auth
# ---------------------------------------------------------------------------

def test_register_login_logout_cycle(c):
    signup(c, "cycle@example.com")
    assert c.get("/api/auth/me").json()["authenticated"] is True
    c.post("/api/auth/logout")
    assert c.get("/api/auth/me").json()["authenticated"] is False
    r = c.post("/api/auth/login", json={"email": "cycle@example.com",
                                        "password": "correct-horse-1"})
    assert r.status_code == 200
    assert c.get("/api/auth/me").json()["authenticated"] is True


def test_duplicate_email_rejected(c):
    signup(c, "dupe@example.com")
    r = c.post("/api/auth/register", json={"email": "dupe@example.com",
                                           "password": "another-pass-9", "name": "X"})
    assert r.status_code == 409


def test_wrong_password_rejected_without_revealing_account(c):
    signup(c, "pw@example.com")
    c.post("/api/auth/logout")
    bad = c.post("/api/auth/login", json={"email": "pw@example.com", "password": "wrong-pass-1"})
    missing = c.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrong-pass-1"})
    assert bad.status_code == missing.status_code == 401
    assert bad.json()["detail"] == missing.json()["detail"], \
        "identical message, so the endpoint cannot enumerate accounts"


def test_weak_password_rejected(c):
    r = c.post("/api/auth/register", json={"email": "weak@example.com", "password": "short"})
    assert r.status_code == 400


def test_password_is_not_stored_in_plaintext():
    row = db.one("SELECT pw_hash FROM users LIMIT 1")
    assert row is not None
    assert b"correct-horse-1" not in row["pw_hash"]
    assert row["pw_hash"].startswith(b"$2")  # bcrypt


# ---------------------------------------------------------------------------
# tenancy
# ---------------------------------------------------------------------------

def test_orgs_cannot_see_each_others_plants():
    a, b = TestClient(app_mod.app), TestClient(app_mod.app)
    signup(a, "orga@example.com", org="Org A")
    signup(b, "orgb@example.com", org="Org B")

    pid = a.post("/api/plants", json={"name": "A Plant", "sector": "textile_dyeing",
                                      "state": "Tamil Nadu"}).json()["id"]

    assert [p["id"] for p in b.get("/api/plants").json()["plants"]] == []
    assert b.get(f"/api/plants/{pid}").status_code == 404
    assert b.post(f"/api/plants/{pid}/assess",
                  json={"profile": profile()}).status_code == 404
    assert b.delete(f"/api/plants/{pid}").status_code == 404


# ---------------------------------------------------------------------------
# plants and assessments
# ---------------------------------------------------------------------------

def test_assessment_persists_and_is_retrievable():
    c = TestClient(app_mod.app)
    signup(c, "persist@example.com")
    pid = c.post("/api/plants", json={"name": "Persist Unit", "sector": "textile_dyeing",
                                      "state": "Tamil Nadu"}).json()["id"]

    r = c.post(f"/api/plants/{pid}/assess", json={"profile": profile(), "label": "Baseline"})
    assert r.status_code == 200, r.text
    res = r.json()
    aid = res["assessment_id"]
    assert res["footprint"]["total_tco2e"] > 0

    again = c.get(f"/api/assessments/{aid}").json()
    assert again["footprint"]["total_tco2e"] == res["footprint"]["total_tco2e"]

    detail = c.get(f"/api/plants/{pid}").json()
    assert len(detail["assessments"]) == 1
    assert detail["assessments"][0]["label"] == "Baseline"


def test_plant_identity_cannot_be_hijacked_via_profile():
    """The plant record is authoritative; the profile only carries activity data."""
    c = TestClient(app_mod.app)
    signup(c, "hijack@example.com")
    pid = c.post("/api/plants", json={"name": "Real Name", "sector": "textile_dyeing"}).json()["id"]
    res = c.post(f"/api/plants/{pid}/assess", json={
        "profile": profile(name="Injected Name", sector="ceramics")}).json()
    assert res["profile"]["name"] == "Real Name"
    assert res["profile"]["sector"] == "textile_dyeing"


def test_unknown_sector_rejected():
    c = TestClient(app_mod.app)
    signup(c, "sector@example.com")
    r = c.post("/api/plants", json={"name": "X", "sector": "not_a_sector"})
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# actions / implementation tracking
# ---------------------------------------------------------------------------

def test_actions_seeded_then_status_survives_reassessment():
    c = TestClient(app_mod.app)
    signup(c, "actions@example.com")
    pid = c.post("/api/plants", json={"name": "Tracker Unit",
                                      "sector": "textile_dyeing"}).json()["id"]
    res = c.post(f"/api/plants/{pid}/assess", json={"profile": profile()}).json()

    actions = c.get(f"/api/plants/{pid}").json()["actions"]
    assert len(actions) == res["recommendations"]["count"]
    assert all(a["status"] == "recommended" for a in actions)

    iid = res["recommendations"]["recommendations"][0]["id"]
    r = c.patch(f"/api/plants/{pid}/actions/{iid}",
                json={"status": "done", "act_abatement_tco2e": 42.0,
                      "act_capex_inr": 250000, "notes": "vendor X"})
    assert r.status_code == 200
    assert r.json()["status"] == "done"
    assert r.json()["completed_at"] is not None

    # Reassessing must refresh estimates without resetting the user's tracker.
    c.post(f"/api/plants/{pid}/assess", json={"profile": profile(electricity_kwh=3200000)})
    after = {a["intervention_id"]: a for a in c.get(f"/api/plants/{pid}").json()["actions"]}
    assert after[iid]["status"] == "done"
    assert after[iid]["act_abatement_tco2e"] == 42.0
    assert after[iid]["notes"] == "vendor X"


def test_invalid_action_status_rejected():
    c = TestClient(app_mod.app)
    signup(c, "badstatus@example.com")
    pid = c.post("/api/plants", json={"name": "S", "sector": "textile_dyeing"}).json()["id"]
    res = c.post(f"/api/plants/{pid}/assess", json={"profile": profile()}).json()
    iid = res["recommendations"]["recommendations"][0]["id"]
    r = c.patch(f"/api/plants/{pid}/actions/{iid}", json={"status": "teleported"})
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# benchmark corpus / flywheel
# ---------------------------------------------------------------------------

def test_corpus_blends_in_only_once_enough_plants_exist():
    c = TestClient(app_mod.app)
    signup(c, "corpus@example.com", org="Corpus Co", kind="consultant")

    before = bm.blended_benchmarks("foundry_casting")
    assert all(v["source"] == "literature" for v in before["provenance"].values())

    fdemo = sector_db().get("foundry_casting")["demo_profile"]
    for i in range(6):
        pid = c.post("/api/plants", json={"name": f"Foundry {i}",
                                          "sector": "foundry_casting"}).json()["id"]
        p = dict(fdemo)
        p["sector"] = "foundry_casting"
        p["electricity_kwh"] = 4_000_000 + i * 400_000
        c.post(f"/api/plants/{pid}/assess", json={"profile": p})

    after = bm.blended_benchmarks("foundry_casting")
    blended = [v for v in after["provenance"].values() if v["source"] == "blended"]
    assert blended, "six plants should be enough to start blending"
    v = blended[0]
    assert v["n"] == 6
    assert v["weight"] == pytest.approx(6 / (6 + bm.PRIOR_STRENGTH), abs=1e-3)


def test_plant_is_never_benchmarked_against_itself():
    c = TestClient(app_mod.app)
    signup(c, "self@example.com")
    pid = c.post("/api/plants", json={"name": "Self", "sector": "foundry_casting"}).json()["id"]
    fdemo = dict(sector_db().get("foundry_casting")["demo_profile"])
    fdemo["sector"] = "foundry_casting"
    c.post(f"/api/plants/{pid}/assess", json={"profile": fdemo})

    with_self = bm.blended_benchmarks("foundry_casting", exclude_plant_id=None)
    without = bm.blended_benchmarks("foundry_casting", exclude_plant_id=pid)
    n_with = next(v["n"] for v in with_self["provenance"].values() if "n" in v)
    n_without = next(v["n"] for v in without["provenance"].values() if "n" in v)
    assert n_without == n_with - 1


def test_only_latest_assessment_per_plant_counts():
    c = TestClient(app_mod.app)
    signup(c, "latest@example.com")
    pid = c.post("/api/plants", json={"name": "Repeat", "sector": "ceramics"}).json()["id"]
    cdemo = dict(sector_db().get("ceramics")["demo_profile"])
    cdemo["sector"] = "ceramics"
    for _ in range(5):
        c.post(f"/api/plants/{pid}/assess", json={"profile": cdemo})

    vals = bm._corpus_values("ceramics", "scope12_per_t", None)
    assert len(vals) == 1, "one plant assessed five times must contribute one data point"


def test_corpus_endpoint_reports_provenance(c):
    body = c.get("/api/corpus").json()
    assert body["prior_strength"] == bm.PRIOR_STRENGTH
    assert any(s["status"] in ("literature", "blended", "measured") for s in body["by_sector"])


# ---------------------------------------------------------------------------
# portfolio and realisation
# ---------------------------------------------------------------------------

def test_portfolio_rolls_up_and_measures_realisation():
    c = TestClient(app_mod.app)
    signup(c, "folio@example.com", org="Folio Consulting", kind="consultant")

    total_expected = 0.0
    first_iid = None
    first_pid = None
    for i, sector in enumerate(["textile_dyeing", "foundry_casting", "ceramics"]):
        pid = c.post("/api/plants", json={"name": f"P{i}", "sector": sector}).json()["id"]
        p = dict(sector_db().get(sector)["demo_profile"])
        p["sector"] = sector
        res = c.post(f"/api/plants/{pid}/assess", json={"profile": p}).json()
        total_expected += res["footprint"]["total_tco2e"]
        if first_iid is None:
            first_pid = pid
            first_iid = res["recommendations"]["recommendations"][0]["id"]

    pf = c.get("/api/portfolio").json()
    assert pf["plants_total"] == 3
    assert pf["plants_assessed"] == 3
    assert pf["total_footprint_tco2e"] == pytest.approx(total_expected, rel=1e-3)
    assert pf["realisation"]["realisation_rate"] in (None, 0.0)

    c.patch(f"/api/plants/{first_pid}/actions/{first_iid}",
            json={"status": "done", "act_abatement_tco2e": 100.0})
    pf2 = c.get("/api/portfolio").json()
    assert pf2["realisation"]["actions_done"] == 1
    assert pf2["realisation"]["realised_tco2e"] == 100.0
    assert pf2["realisation"]["realisation_rate"] > 0


# ---------------------------------------------------------------------------
# report
# ---------------------------------------------------------------------------

def test_report_renders():
    c = TestClient(app_mod.app)
    signup(c, "report@example.com")
    pid = c.post("/api/plants", json={"name": "Report Unit",
                                      "sector": "textile_dyeing"}).json()["id"]
    aid = c.post(f"/api/plants/{pid}/assess", json={"profile": profile()}).json()["assessment_id"]

    h = c.get(f"/api/assessments/{aid}/report?fmt=html")
    assert h.status_code == 200
    assert "Marginal abatement cost curve" in h.text
    assert "<svg" in h.text, "the MACC must be embedded as vector, not omitted"

    p = c.get(f"/api/assessments/{aid}/report")
    assert p.status_code == 200
    # PDF where a browser exists, HTML fallback where it does not - both acceptable.
    assert p.content[:4] == b"%PDF" or p.headers.get("X-Chakra-Note")
