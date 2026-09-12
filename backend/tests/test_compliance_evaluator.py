"""
Tests for the compliance rule evaluator service (B2).
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.workers.outbox import process_once
from tests.conftest import register_org


def drain() -> int:
    total = 0
    while True:
        handled = process_once()
        total += handled
        if handled == 0:
            return total


def test_compliance_evaluation_flow(client: TestClient) -> None:
    maker = register_org(client, "steel-owner@example.com", "Tata SME Supplier", "manufacturer")
    headers = maker["headers"]

    # 1. Create factory with EU export exposure in covered CBAM sector (foundry_casting)
    fac = client.post("/api/factories", headers=headers, json={
        "name": "Kalinga Forgings",
        "sector": "foundry_casting",
        "state": "Odisha",
        "annual_revenue_inr_cr": 80.0,
    }).json()
    fac_id = fac["id"]

    client.put(f"/api/factories/{fac_id}/profile", headers=headers, json={
        "annual_output_t": 12000.0,
        "eu_export_share_pct": 35.0,
        "tariff_inr_per_kwh": 7.8,
    })

    client.post(f"/api/factories/{fac_id}/activity", headers=headers, json={
        "stream_kind": "electricity",
        "quantity": 4_500_000,
        "unit": "kWh",
        "label": "Grid Electricity",
    })
    client.post(f"/api/factories/{fac_id}/activity", headers=headers, json={
        "stream_kind": "fuel",
        "factor_key": "COAL_INDIAN",
        "quantity": 2500,
        "unit": "tonne",
        "label": "Coking Coal",
    })
    client.post(f"/api/factories/{fac_id}/activity", headers=headers, json={
        "stream_kind": "material",
        "factor_key": "STEEL_PRIMARY",
        "quantity": 10000,
        "unit": "tonne",
        "label": "Hot Metal Ingot",
    })

    # 2. Run assessment — this emits COMPLIANCE_EVALUATION_REQUESTED
    ass = client.post(f"/api/factories/{fac_id}/assessments", headers=headers, json={
        "label": "CBAM Assessment FY26",
    }).json()
    assert ass["id"].startswith("asm_")

    # 3. Drain outbox
    handled = drain()
    assert handled >= 1

    # 4. Check compliance cases created automatically
    cases = client.get(f"/api/compliance/cases?factory_id={fac_id}", headers=headers).json()
    assert len(cases) >= 2

    rule_ids = {c["rule_id"] for c in cases}
    assert "CBAM_DEFINITIVE_EXPOSURE_001" in rule_ids

    cbam_case = next(c for c in cases if c["rule_id"] == "CBAM_DEFINITIVE_EXPOSURE_001")
    assert cbam_case["rule_pack"] == "CBAM"
    assert cbam_case["rule_pack_version"] == "2026.1"
    assert cbam_case["severity"] in ("high", "critical")
    assert cbam_case["requires_human_review"] is True
    assert "35.0%" in cbam_case["reason"]

    # 5. Check factory readiness overview reflects open cases
    readiness = client.get(f"/api/factories/{fac_id}/compliance", headers=headers).json()
    assert readiness["open_cases"] >= 2
    assert readiness["overall"] in ("ACTION_REQUIRED", "HUMAN_REVIEW_REQUIRED")
    assert "CBAM" in readiness["rule_packs_evaluated"]
