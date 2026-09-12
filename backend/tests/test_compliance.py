"""
Compliance case management.

These tests hold the line that matters in this module: BE-1 *records* verdicts
and accountability, it does not decide them. A case must carry the rule and the
rule-pack version it rests on, a case flagged for human review cannot be closed
on an empty record, and requesting an evaluation queues work rather than
returning an answer.
"""
from __future__ import annotations

import io

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.governance import Event
from tests.conftest import register_org


def _assessed_factory(client: TestClient, headers: dict, name: str) -> dict:
    factory = client.post("/api/factories", headers=headers, json={
        "name": name, "sector": "foundry_casting", "state": "Gujarat",
    }).json()
    client.post(f"/api/intake/factories/{factory['id']}/confirm", headers=headers, json={
        "profile_updates": {
            "annual_output_t": 3000, "annual_revenue_cr": 36,
            "export_share_pct": 40, "eu_export_share_pct": 25,
        },
        "activity_records": [
            {"stream_kind": "electricity", "quantity": 2_400_000, "unit": "kWh"},
            {"stream_kind": "fuel", "factor_key": "COAL_INDIAN", "quantity": 800,
             "unit": "tonne"},
            {"stream_kind": "material", "factor_key": "STEEL_PRIMARY", "quantity": 2600,
             "unit": "tonne"},
        ],
    })
    client.post(f"/api/factories/{factory['id']}/assessments", headers=headers, json={})
    return factory


def test_readiness_labels_where_every_line_came_from(client: TestClient) -> None:
    user = register_org(client, "readiness@example.com", "Readiness Co", "manufacturer")
    headers = user["headers"]
    factory = _assessed_factory(client, headers, "Readiness Plant")

    body = client.get(f"/api/factories/{factory['id']}/compliance", headers=headers).json()

    assert body["assessment_id"]
    assert body["items"], "readiness should report something once an assessment exists"
    # Every line says what produced it, so the UI never has to guess whether a
    # status is engine output, an evidence count or a stored case.
    for item in body["items"]:
        assert item["basis"]
    keys = {item["key"] for item in body["items"]}
    assert {"scope1", "scope2", "scope3", "evidence", "data_quality"} <= keys

    # EU export exposure exists, so the CBAM line appears, marked indicative.
    cbam = next(i for i in body["items"] if i["key"] == "cbam")
    assert "indicative" in cbam["basis"]

    # The claim boundary travels with the response.
    assert "does not determine legal compliance" in body["caveat"]
    assert body["overall"] in (
        "READY", "PARTIAL", "AT_RISK", "ACTION_REQUIRED", "HUMAN_REVIEW_REQUIRED",
    )


def test_readiness_says_missing_before_an_assessment_exists(client: TestClient) -> None:
    user = register_org(client, "noassess@example.com", "No Assessment Co", "manufacturer")
    factory = client.post("/api/factories", headers=user["headers"], json={
        "name": "Bare Plant", "sector": "ceramics",
    }).json()

    body = client.get(
        f"/api/factories/{factory['id']}/compliance", headers=user["headers"]
    ).json()
    assert body["assessment_id"] is None
    assert body["items"][0]["key"] == "assessment"
    assert body["items"][0]["status"] == "MISSING"


def test_evaluation_is_queued_not_answered(client: TestClient) -> None:
    """202 and an event, never a verdict.

    Deciding compliance is BE-2's. Returning a determination from this endpoint
    would mean inventing one.
    """
    user = register_org(client, "evaluate@example.com", "Evaluate Co", "manufacturer")
    headers = user["headers"]
    factory = _assessed_factory(client, headers, "Evaluate Plant")

    response = client.post("/api/compliance/evaluate", headers=headers,
                           json={"factory_id": factory["id"]})
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    assert "compliance" not in body.get("note", "").lower() or "evaluator" in body["note"]

    with SessionLocal() as db:
        event = db.get(Event, body["event_id"])
        assert event.event_type == "COMPLIANCE_EVALUATION_REQUESTED"
        assert event.status == "PENDING"


def test_evaluation_needs_an_assessment_first(client: TestClient) -> None:
    user = register_org(client, "evalbare@example.com", "Eval Bare Co", "manufacturer")
    factory = client.post("/api/factories", headers=user["headers"], json={
        "name": "Eval Bare Plant", "sector": "ceramics",
    }).json()
    response = client.post("/api/compliance/evaluate", headers=user["headers"],
                           json={"factory_id": factory["id"]})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "no_assessment"


def test_case_lifecycle_flagged_to_closed(client: TestClient) -> None:
    user = register_org(client, "cases@example.com", "Cases Co", "manufacturer")
    headers = user["headers"]
    factory = _assessed_factory(client, headers, "Cases Plant")

    created = client.post("/api/compliance/cases", headers=headers, json={
        "factory_id": factory["id"],
        "rule_id": "CBAM_DATA_GAP_01",
        "rule_pack": "CBAM",
        "rule_pack_version": "2026.1",
        "title": "EU export exposure with incomplete embedded-emissions evidence",
        "reason": "EU export share is declared but product-level evidence is missing.",
        "severity": "high",
        "required_evidence": ["product CN codes", "installation-level emissions data"],
    })
    assert created.status_code == 201, created.text
    case = created.json()

    # High severity pulls in a human whether or not the caller asked for it.
    assert case["requires_human_review"] is True
    assert case["flow_state"] == "FLAGGED"
    assert case["rule_pack_version"] == "2026.1"

    acknowledged = client.patch(f"/api/compliance/cases/{case['id']}", headers=headers,
                                json={"flow_state": "ACKNOWLEDGED"}).json()
    assert acknowledged["flow_state"] == "ACKNOWLEDGED"

    # A corrective action moves the case along and blocks closure while open.
    with_action = client.post(
        f"/api/compliance/cases/{case['id']}/corrective-actions", headers=headers,
        json={"title": "Obtain CN codes from the customs broker", "due_date": "2026-11-30"},
    )
    assert with_action.status_code == 201
    action = with_action.json()["corrective_actions"][0]

    # Both reasons this cannot close yet come back together, not one per request.
    blocked = client.post(f"/api/compliance/cases/{case['id']}/close", headers=headers,
                          json={"reason": "Evidence gathered and reviewed."})
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "case_not_closeable"
    codes = {b["code"] for b in blocked.json()["error"]["details"]["blockers"]}
    assert codes == {"corrective_actions_open", "closing_evidence_required"}

    client.patch(f"/api/compliance/corrective-actions/{action['id']}", headers=headers,
                 json={"status": "DONE"})

    # Still blocked, but now for one reason only: human review needs evidence.
    no_evidence = client.post(f"/api/compliance/cases/{case['id']}/close", headers=headers,
                              json={"reason": "Evidence gathered and reviewed."})
    assert no_evidence.status_code == 409
    remaining = no_evidence.json()["error"]["details"]["blockers"]
    assert [b["code"] for b in remaining] == ["closing_evidence_required"]

    evidence = client.post(
        "/api/evidence", headers=headers,
        files={"file": ("cn-codes.pdf", io.BytesIO(b"%PDF-1.4 cn codes"), "application/pdf")},
        data={"factory_id": factory["id"], "evidence_type": "regulator_document"},
    ).json()

    closed = client.post(f"/api/compliance/cases/{case['id']}/close", headers=headers, json={
        "reason": "CN codes obtained and installation data supplied by the mill.",
        "evidence_ids": [evidence["id"]],
    })
    assert closed.status_code == 200, closed.text
    closed_body = closed.json()
    assert closed_body["flow_state"] == "CLOSED"
    assert closed_body["closed_at"]
    assert closed_body["evidence_count"] == 1

    # A closed case stays closed - the record is not editable afterwards.
    reopened = client.patch(f"/api/compliance/cases/{case['id']}", headers=headers,
                            json={"status": "ACTION_REQUIRED"})
    assert reopened.status_code == 409
    assert reopened.json()["error"]["code"] == "case_closed"


def test_evidence_from_another_factory_cannot_back_a_case(client: TestClient) -> None:
    user = register_org(client, "crossev@example.com", "Cross Evidence Co", "manufacturer")
    headers = user["headers"]
    one = _assessed_factory(client, headers, "Plant One")
    two = client.post("/api/factories", headers=headers, json={
        "name": "Plant Two", "sector": "ceramics",
    }).json()

    case = client.post("/api/compliance/cases", headers=headers, json={
        "factory_id": one["id"], "rule_id": "BRSR_EVID_02", "rule_pack": "BRSR_CORE",
        "rule_pack_version": "2024.1", "title": "Missing energy evidence",
        "severity": "low",
    }).json()

    other_evidence = client.post(
        "/api/evidence", headers=headers,
        files={"file": ("other.pdf", io.BytesIO(b"%PDF-1.4 other"), "application/pdf")},
        data={"factory_id": two["id"], "evidence_type": "electricity_bill"},
    ).json()

    response = client.post(
        f"/api/compliance/cases/{case['id']}/evidence", headers=headers,
        params={"evidence_id": other_evidence["id"]},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "evidence_factory_mismatch"


def test_cases_do_not_cross_tenants(client: TestClient) -> None:
    owner = register_org(client, "caseowner@example.com", "Case Owner", "manufacturer")
    stranger = register_org(client, "casestranger@example.com", "Case Stranger",
                            "manufacturer")
    factory = _assessed_factory(client, owner["headers"], "Owned Plant")
    case = client.post("/api/compliance/cases", headers=owner["headers"], json={
        "factory_id": factory["id"], "rule_id": "PAT_SCOPE_01", "rule_pack": "PAT",
        "rule_pack_version": "2026.1", "title": "PAT applicability to confirm",
    }).json()

    assert client.get(f"/api/compliance/cases/{case['id']}",
                      headers=stranger["headers"]).status_code == 404
    assert client.get("/api/compliance/cases", headers=stranger["headers"]).json() == []
    assert client.get(f"/api/factories/{factory['id']}/compliance",
                      headers=stranger["headers"]).status_code == 404
    assert client.post(f"/api/compliance/cases/{case['id']}/close",
                       headers=stranger["headers"],
                       json={"reason": "not mine to close"}).status_code == 404


def test_a_case_cannot_exist_without_its_rule(client: TestClient) -> None:
    user = register_org(client, "norule@example.com", "No Rule Co", "manufacturer")
    factory = _assessed_factory(client, user["headers"], "No Rule Plant")
    response = client.post("/api/compliance/cases", headers=user["headers"], json={
        "factory_id": factory["id"], "title": "Something looks wrong",
    })
    assert response.status_code == 422
    missing = {tuple(e["loc"]) for e in response.json()["error"]["details"]["errors"]}
    assert ("body", "rule_id") in missing
    assert ("body", "rule_pack_version") in missing
