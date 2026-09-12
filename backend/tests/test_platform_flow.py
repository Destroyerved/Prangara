"""
End-to-end platform tests.

`test_full_demo_story` walks the demo path from PRD section 32 through the real
API: register, create a factory, onboard conversationally, confirm, assess, read
leaks and recommendations, find a provider, compare quotes, accept one, record
evidence, and verify. If this test passes, the backend half of the demo works.
"""
from __future__ import annotations

import io

from fastapi.testclient import TestClient

from tests.conftest import register_org


def test_health_reports_engine_and_versions(client: TestClient) -> None:
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["engine"]["sectors"] > 0
    assert body["engine"]["interventions"] > 0
    assert body["engine"]["reference_versions"]["factors"]["content_hash"]
    # Honest capability reporting - the client uses this to hide unavailable
    # features rather than offering something that will fail.
    assert set(body["features"]) == {"postgres", "object_storage", "llm_intake"}


def test_sandbox_needs_no_account(client: TestClient) -> None:
    response = client.get("/api/demo/textile_dyeing")
    assert response.status_code == 200
    body = response.json()
    assert body["persisted"] is False
    assert body["footprint"]["total_tco2e"] > 0
    assert "not a BEE-accredited audit" in body["claim_boundary"]


def test_protected_routes_reject_anonymous(client: TestClient) -> None:
    assert client.get("/api/factories").status_code == 401
    assert client.get("/api/notifications").status_code == 401


def test_full_demo_story(client: TestClient) -> None:
    maker = register_org(client, "demo-owner@example.com", "Hero Foundry", "manufacturer")
    headers = maker["headers"]

    # 1. create factory -------------------------------------------------
    factory = client.post("/api/factories", headers=headers, json={
        "name": "Hero Foundry", "sector": "foundry_casting", "state": "Gujarat",
        "district": "Rajkot", "latitude": 22.30, "longitude": 70.80,
    }).json()
    assert factory["id"].startswith("fac_")

    # 2. conversational onboarding --------------------------------------
    extract = client.post("/api/intake/conversation/extract", headers=headers, json={
        "factory_id": factory["id"],
        "message": (
            "We run a foundry in Rajkot, produce 4200 tonnes a year, use about "
            "3,400,000 kWh of electricity and 900 tonnes of coal."
        ),
    }).json()
    assert extract["requires_user_confirmation"] is True
    found = {f["field"]: f["value"] for f in extract["fields"]}
    assert found["annual_output_t"] == 4200
    assert found["electricity_kwh"] == 3_400_000
    assert found["fuel_COAL_INDIAN"] == 900
    # Nothing is written by extraction.
    assert client.get(f"/api/factories/{factory['id']}/activity",
                      headers=headers).json() == []

    # 3. confirm ---------------------------------------------------------
    confirmed = client.post(
        f"/api/intake/factories/{factory['id']}/confirm", headers=headers, json={
            "source_kind": "conversation",
            "profile_updates": {
                "annual_output_t": 4200, "annual_revenue_cr": 48,
                "tariff_inr_per_kwh": 8.2, "eu_export_share_pct": 18,
                "export_share_pct": 30,
            },
            "activity_records": [
                {"stream_kind": "electricity", "quantity": 3_400_000, "unit": "kWh",
                 "label": "Purchased electricity", "data_state": "DECLARED"},
                {"stream_kind": "fuel", "factor_key": "COAL_INDIAN", "quantity": 900,
                 "unit": "tonne", "label": "Coal", "data_state": "DECLARED"},
                {"stream_kind": "material", "factor_key": "STEEL_PRIMARY", "quantity": 3800,
                 "unit": "tonne", "label": "Pig iron and steel scrap"},
                {"stream_kind": "waste", "factor_key": "LANDFILL_INERT", "quantity": 260,
                 "unit": "tonne", "label": "Foundry sand"},
                {"stream_kind": "freight", "factor_key": "ROAD_FREIGHT_HCV",
                 "quantity": 1_900_000, "unit": "tonne-km", "label": "Road freight"},
            ],
        }).json()
    assert len(confirmed["created_activity_record_ids"]) == 5

    # 4. assess ----------------------------------------------------------
    response = client.post(f"/api/factories/{factory['id']}/assessments",
                           headers=headers, json={"label": "Baseline FY25"})
    assert response.status_code == 201, response.text
    assessment = response.json()

    footprint = assessment["result"]["footprint"]
    assert footprint["total_tco2e"] > 0
    assert footprint["total_range"]["low"] <= footprint["total_tco2e"] <= footprint["total_range"]["high"]
    # Version stamp is what makes the result reproducible later.
    assert assessment["version_stamp"]["engine_version"]
    assert assessment["version_stamp"]["factor_hash"]
    assert assessment["result"]["data_quality"]["score"] >= 0

    leaks = assessment["result"]["leaks"]
    assert leaks["leak_count"] >= 1
    assert leaks["leaks"][0]["finding"]

    recommendations = assessment["result"]["recommendations"]
    assert recommendations["count"] > 0
    assert assessment["result"]["sankey"]["links"]
    assert recommendations["macc_curve"]

    # 5. recommendations became trackable actions ------------------------
    actions = client.get(f"/api/factories/{factory['id']}/actions", headers=headers).json()
    assert len(actions) >= recommendations["count"]
    tracked = next(a for a in actions if not a["was_blocked"])

    # 6. provider directory and matching ---------------------------------
    provider_user = register_org(client, "vendor@example.com", "Gujarat Energy Services", "provider")
    provider = client.post("/api/providers", headers=provider_user["headers"], json={
        "name": "Gujarat Energy Services", "provider_type": "installation_contractor",
        "state": "Gujarat", "latitude": 22.31, "longitude": 70.81,
        "service_states": ["Gujarat"], "typical_lead_time_days": 21,
    }).json()
    client.post(f"/api/providers/{provider['id']}/services",
                headers=provider_user["headers"], json={
                    "category": "energy", "name": "VFD and motor retrofits",
                    "intervention_ids": [tracked["intervention_id"]],
                    "indicative_price_inr": 450000, "warranty_months": 24,
                })

    matches = client.get("/api/providers/match", headers=headers, params={
        "factory_id": factory["id"], "intervention_id": tracked["intervention_id"],
    }).json()
    assert matches and matches[0]["provider"]["id"] == provider["id"]
    assert matches[0]["reasons"]

    # 7. RFQ and quote ----------------------------------------------------
    rfq = client.post("/api/rfqs", headers=headers, json={
        "factory_id": factory["id"], "intervention_id": tracked["intervention_id"],
        "action_id": tracked["id"], "title": "VFD retrofit on main blowers",
        "provider_ids": [provider["id"]],
    }).json()
    assert rfq["status"] == "OPEN"
    # The provider sees the RFQ but not the assessment behind it.
    assert "assessment_id" not in rfq["shared_context"]

    quote = client.post(f"/api/rfqs/{rfq['id']}/quotes",
                        headers=provider_user["headers"], json={
                            "price_inr": 520000, "installation_included": True,
                            "warranty_months": 24, "delivery_days": 30,
                        })
    assert quote.status_code == 201, quote.text
    quote = quote.json()
    assert quote["comparison"]["basis"]

    comparison = client.get(f"/api/rfqs/{rfq['id']}/compare", headers=headers).json()
    assert len(comparison["quotes"]) == 1
    assert comparison["engine_estimate"]["expected_capex_inr"] is not None

    accepted = client.post(f"/api/quotes/{quote['id']}/accept", headers=headers).json()
    assert accepted["status"] == "ACCEPTED"

    # 8. implement and evidence ------------------------------------------
    client.patch(f"/api/actions/{tracked['id']}", headers=headers,
                 json={"status": "IMPLEMENTING"})
    evidence = client.post(
        "/api/evidence", headers=headers,
        files={"file": ("install.png", io.BytesIO(b"\x89PNG\r\n\x1a\nfake"), "image/png")},
        data={"factory_id": factory["id"], "evidence_type": "installation_photo",
              "title": "VFD installed"},
    )
    assert evidence.status_code == 201, evidence.text
    evidence = evidence.json()
    client.post(f"/api/evidence/{evidence['id']}/links", headers=headers, json={
        "target_type": "action", "target_id": tracked["id"], "role": "completion_proof",
    })
    completed = client.patch(f"/api/actions/{tracked['id']}", headers=headers,
                             json={"status": "COMPLETED", "actual_capex_inr": 520000}).json()
    assert completed["completed_at"]
    # The expectation the factory committed against is untouched.
    assert completed["expected_capex_inr"] == tracked["expected_capex_inr"]

    # 9. verification ------------------------------------------------------
    period = client.post(f"/api/actions/{tracked['id']}/verification", headers=headers, json={
        "period_start": "2026-04-01", "period_end": "2027-03-31",
        "normalisation": {"basis": "per tonne of output"},
    }).json()
    verified = client.post(f"/api/verification/{period['id']}/results", headers=headers, json=[
        {"metric": "electricity_kwh", "unit": "kWh", "baseline_value": 3_400_000,
         "expected_value": 3_150_000, "actual_value": 3_220_000},
    ]).json()
    assert verified["results"][0]["achievement_pct"] == 72.0

    # 10. audit trail and events -------------------------------------------
    audit = client.get(f"/api/factories/{factory['id']}/audit", headers=headers).json()
    assert {"factory.create", "assessment.run", "quote.accept"} <= {a["action"] for a in audit}
    stream = client.get(f"/api/factories/{factory['id']}/events", headers=headers).json()
    assert "ASSESSMENT_COMPLETED" in {e["event_type"] for e in stream}


def test_scenario_does_not_overwrite_baseline(client: TestClient) -> None:
    maker = register_org(client, "scenario@example.com", "Scenario Textiles", "manufacturer")
    headers = maker["headers"]
    factory = client.post("/api/factories", headers=headers, json={
        "name": "Scenario Textiles", "sector": "textile_dyeing", "state": "Gujarat",
    }).json()
    client.post(f"/api/intake/factories/{factory['id']}/confirm", headers=headers, json={
        "profile_updates": {"annual_output_t": 2400, "annual_revenue_cr": 30},
        "activity_records": [
            {"stream_kind": "electricity", "quantity": 2_100_000, "unit": "kWh"},
            {"stream_kind": "fuel", "factor_key": "COAL_INDIAN", "quantity": 1400,
             "unit": "tonne"},
        ],
    })
    baseline = client.post(f"/api/factories/{factory['id']}/assessments",
                           headers=headers, json={}).json()

    scenario = client.post(f"/api/factories/{factory['id']}/scenarios", headers=headers, json={
        "name": "20 percent solar", "baseline_assessment_id": baseline["id"],
        "modifications": [{"kind": "solar_share_pct", "value": 20}],
    }).json()
    comparison = client.post(f"/api/scenarios/{scenario['id']}/run", headers=headers).json()

    assert comparison["delta_tco2e"] < 0, "removing grid purchase should lower the footprint"
    assert comparison["result"]["is_baseline"] is False
    # The baseline row is untouched.
    reread = client.get(f"/api/assessments/{baseline['id']}", headers=headers).json()
    assert reread["total_tco2e"] == baseline["total_tco2e"]


def test_scenario_declares_what_it_cannot_model(client: TestClient) -> None:
    maker = register_org(client, "unsupported@example.com", "Edge Case Works", "manufacturer")
    headers = maker["headers"]
    factory = client.post("/api/factories", headers=headers, json={
        "name": "Edge Case Works", "sector": "textile_dyeing", "state": "Gujarat",
    }).json()
    client.post(f"/api/intake/factories/{factory['id']}/confirm", headers=headers, json={
        "profile_updates": {"annual_output_t": 1000},
        "activity_records": [
            {"stream_kind": "electricity", "quantity": 900_000, "unit": "kWh"},
        ],
    })
    baseline = client.post(f"/api/factories/{factory['id']}/assessments",
                           headers=headers, json={}).json()
    scenario = client.post(f"/api/factories/{factory['id']}/scenarios", headers=headers, json={
        "name": "Impossible switch", "baseline_assessment_id": baseline["id"],
        "modifications": [
            {"kind": "fuel_switch", "value": 50, "target_key": "COAL_INDIAN",
             "replacement_key": "BIOMASS_BRIQUETTE"},
        ],
    }).json()
    comparison = client.post(f"/api/scenarios/{scenario['id']}/run", headers=headers).json()
    # The plant burns no coal, so the switch cannot be applied. Saying so beats
    # silently returning an unchanged result.
    assert any("not a fuel this plant burns" in u for u in comparison["unsupported"])


def test_assessment_refuses_empty_factory(client: TestClient) -> None:
    maker = register_org(client, "empty@example.com", "Empty Works", "manufacturer")
    headers = maker["headers"]
    factory = client.post("/api/factories", headers=headers, json={
        "name": "Empty Works", "sector": "foundry_casting",
    }).json()
    response = client.post(f"/api/factories/{factory['id']}/assessments",
                           headers=headers, json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "no_activity_data"


def test_unknown_sector_is_rejected(client: TestClient) -> None:
    maker = register_org(client, "badsector@example.com", "Bad Sector", "manufacturer")
    response = client.post("/api/factories", headers=maker["headers"], json={
        "name": "Nowhere", "sector": "nuclear_fusion",
    })
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "unknown_sector"


def test_unit_mismatch_fails_loudly(client: TestClient) -> None:
    maker = register_org(client, "units@example.com", "Unit Works", "manufacturer")
    headers = maker["headers"]
    factory = client.post("/api/factories", headers=headers, json={
        "name": "Unit Works", "sector": "foundry_casting",
    }).json()
    client.post(f"/api/factories/{factory['id']}/activity", headers=headers, json={
        "stream_kind": "fuel", "factor_key": "COAL_INDIAN", "quantity": 500,
        "unit": "litre",
    })
    response = client.post(f"/api/factories/{factory['id']}/assessments",
                           headers=headers, json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unit_mismatch"
