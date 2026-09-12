"""
Tests for Offline Mobile Queue Idempotency (M2).

Verifies that offline mobile clients retrying queue sync with a client_ref
receive the existing record and do not create duplicate database rows or 409 conflicts.
"""
from __future__ import annotations

import io

from fastapi.testclient import TestClient

from tests.conftest import register_org


def test_evidence_upload_idempotency(client: TestClient) -> None:
    maker = register_org(client, "offline-test@example.com", "Offline Plant", "manufacturer")
    headers = maker["headers"]

    file1 = io.BytesIO(b"%PDF-1.4 Mock electricity bill month 1")
    res1 = client.post(
        "/api/evidence",
        headers=headers,
        data={
            "evidence_type": "electricity_bill",
            "title": "EB Bill May 2026",
            "client_ref": "OFFLINE-MOB-EVD-9911",
        },
        files={"file": ("bill1.pdf", file1, "application/pdf")},
    )
    assert res1.status_code == 201
    doc1 = res1.json()
    assert doc1["id"].startswith("evd_")
    assert doc1["client_ref"] == "OFFLINE-MOB-EVD-9911"

    # Retried submission with the same client_ref (network reconnection)
    file2 = io.BytesIO(b"%PDF-1.4 Mock electricity bill retry")
    res2 = client.post(
        "/api/evidence",
        headers=headers,
        data={
            "evidence_type": "electricity_bill",
            "title": "EB Bill May 2026 Retry",
            "client_ref": "OFFLINE-MOB-EVD-9911",
        },
        files={"file": ("bill1_retry.pdf", file2, "application/pdf")},
    )
    assert res2.status_code == 201
    doc2 = res2.json()
    # Must match original ID rather than creating a duplicate or failing with 409
    assert doc2["id"] == doc1["id"]


def test_intake_confirm_idempotency(client: TestClient) -> None:
    maker = register_org(client, "intake-offline@example.com", "Intake Offline Works", "manufacturer")
    headers = maker["headers"]

    factory = client.post("/api/factories", headers=headers, json={
        "name": "Intake Offline Factory",
        "sector": "textile_dyeing",
        "state": "Tamil Nadu",
    }).json()
    fac_id = factory["id"]

    # Initial confirmation with offline client_ref tags
    payload = {
        "profile_updates": {"annual_output_t": 3500.0},
        "activity_records": [
            {
                "stream_kind": "electricity",
                "quantity": 1200000.0,
                "unit": "kWh",
                "client_ref": "OFFLINE-ACT-ELEC-1",
            },
            {
                "stream_kind": "fuel",
                "factor_key": "COAL_INDIAN",
                "quantity": 450.0,
                "unit": "tonne",
                "client_ref": "OFFLINE-ACT-FUEL-1",
            },
        ],
        "source_kind": "manual",
    }

    res1 = client.post(f"/api/intake/factories/{fac_id}/confirm", headers=headers, json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1["created_activity_record_ids"]) == 2
    rec_ids_1 = data1["created_activity_record_ids"]

    # Retry with the same payload and client_refs
    res2 = client.post(f"/api/intake/factories/{fac_id}/confirm", headers=headers, json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    # Must return existing record IDs without creating duplicate records
    assert data2["created_activity_record_ids"] == rec_ids_1

    # Verify total activity records for the factory is 2, not 4
    activities = client.get(f"/api/factories/{fac_id}/activity", headers=headers).json()
    assert len(activities) == 2

    # Direct add_activity idempotency test
    act_direct_1 = client.post(
        f"/api/factories/{fac_id}/activity",
        headers=headers,
        json={
            "stream_kind": "material",
            "quantity": 100.0,
            "unit": "tonne",
            "client_ref": "OFFLINE-DIRECT-MAT-1",
        },
    ).json()
    act_direct_2 = client.post(
        f"/api/factories/{fac_id}/activity",
        headers=headers,
        json={
            "stream_kind": "material",
            "quantity": 100.0,
            "unit": "tonne",
            "client_ref": "OFFLINE-DIRECT-MAT-1",
        },
    ).json()
    assert act_direct_1["id"] == act_direct_2["id"]


def test_shipment_offline_idempotency(client: TestClient) -> None:
    maker = register_org(client, "logistics-offline@example.com", "Offline Freight Works", "manufacturer")
    headers = maker["headers"]

    payload = {
        "origin_name": "Surat Hub",
        "origin_lat": 21.1702,
        "origin_lon": 72.8311,
        "destination_name": "Mumbai JNPT",
        "dest_lat": 18.9499,
        "dest_lon": 72.9511,
        "payload_tonnes": 14.0,
        "client_ref": "OFFLINE-SHP-2026-001",
    }

    res1 = client.post("/api/shipments", headers=headers, json=payload)
    assert res1.status_code == 201
    shp1 = res1.json()

    res2 = client.post("/api/shipments", headers=headers, json=payload)
    assert res2.status_code == 201
    shp2 = res2.json()
    assert shp2["id"] == shp1["id"]
