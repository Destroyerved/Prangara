"""
Tests for working paper report export (PDF/HTML).
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import register_org


def test_report_export_html_and_pdf(client: TestClient) -> None:
    maker = register_org(client, "report-test@example.com", "Report Plant", "manufacturer")
    headers = maker["headers"]

    # 1. Create factory & activity
    fac = client.post("/api/factories", headers=headers, json={
        "name": "Gujarat Precision Castings",
        "sector": "foundry_casting",
        "state": "Gujarat",
        "annual_revenue_inr_cr": 45.0,
    }).json()
    fac_id = fac["id"]

    client.put(f"/api/factories/{fac_id}/profile", headers=headers, json={
        "annual_production_tonnes": 4000.0,
        "electricity_tariff_inr_kwh": 8.5,
    })

    client.post(f"/api/factories/{fac_id}/activity", headers=headers, json={
        "stream_kind": "electricity",
        "quantity": 1_200_000,
        "unit": "kWh",
        "label": "Grid Power",
    })
    client.post(f"/api/factories/{fac_id}/activity", headers=headers, json={
        "stream_kind": "fuel",
        "factor_key": "COAL_INDIAN",
        "quantity": 300,
        "unit": "tonne",
        "label": "Thermal Coal",
    })

    # 2. Run assessment
    ass = client.post(f"/api/factories/{fac_id}/assessments", headers=headers, json={
        "label": "Baseline Q1",
    }).json()
    ass_id = ass["id"]

    # 3. Export HTML report
    res_html = client.get(f"/api/assessments/{ass_id}/report?fmt=html", headers=headers)
    assert res_html.status_code == 200
    assert "text/html" in res_html.headers.get("content-type", "")
    html_text = res_html.text
    assert "PRANGARA" in html_text
    assert "Gujarat Precision Castings" in html_text
    assert "Emission inventory" in html_text
    assert "Marginal abatement cost curve" in html_text
    assert "<svg" in html_text  # MACC SVG embedded
    assert "Scope 1" in html_text
    assert "Scope 2" in html_text
    assert "Engine v" in html_text  # Version stamp present
    assert "not a BEE-accredited energy audit" in html_text  # Claim boundary present

    # 4. Request PDF format
    res_pdf = client.get(f"/api/assessments/{ass_id}/report?fmt=pdf", headers=headers)
    assert res_pdf.status_code == 200
    # Either PDF bytes (if Chrome/Edge is installed) or HTML fallback with header
    if res_pdf.headers.get("content-type") == "application/pdf":
        assert len(res_pdf.content) > 1000
    else:
        assert res_pdf.headers.get("X-Report-Fallback") == "pdf_engine_unavailable"
        assert "PRANGARA" in res_pdf.text

    # 5. Access control: other tenant cannot read report
    other = register_org(client, "other-maker@example.com", "Other Co", "manufacturer")
    res_forbidden = client.get(f"/api/assessments/{ass_id}/report", headers=other["headers"])
    assert res_forbidden.status_code == 404
