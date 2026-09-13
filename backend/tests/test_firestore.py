"""
Tests for Google Cloud Firestore client and repository adapter.
"""
from __future__ import annotations

import unittest.mock as mock
from app.core.config import Settings
from app.core.firestore_db import get_firestore_client, is_firestore_enabled
from app.services.firestore_repo import FirestoreRepository, get_firestore_repo


def test_firestore_settings_toggle():
    with mock.patch.dict("os.environ", {"DATABASE_BACKEND": "firestore"}):
        s = Settings()
        assert s.is_firestore is True


def test_firestore_repo_mocked_crud():
    mock_client = mock.MagicMock()
    repo = FirestoreRepository()
    repo.client = mock_client

    # Test save organization
    mock_doc = mock.MagicMock()
    mock_client.collection.return_value.document.return_value = mock_doc
    res_org = repo.save_organization("org_test_123", {"name": "Test Mill", "type": "manufacturer"})
    assert res_org["id"] == "org_test_123"
    assert res_org["name"] == "Test Mill"
    assert "updated_at" in res_org
    mock_doc.set.assert_called_once()

    # Test save factory
    mock_doc.reset_mock()
    res_fac = repo.save_factory("fac_test_456", {
        "organization_id": "org_test_123",
        "name": "Coimbatore Foundry",
        "sector": "foundry_casting",
    })
    assert res_fac["id"] == "fac_test_456"
    assert res_fac["sector"] == "foundry_casting"
    mock_doc.set.assert_called_once()

    # Test save assessment
    mock_doc.reset_mock()
    res_asm = repo.save_assessment("asm_test_789", {
        "factory_id": "fac_test_456",
        "is_baseline": True,
        "headline_metrics": {"total_tco2e": 1240.5, "scope1": 800.0},
    })
    assert res_asm["id"] == "asm_test_789"
    assert res_asm["headline_metrics"]["total_tco2e"] == 1240.5
    mock_doc.set.assert_called_once()

    # Test save provider
    mock_doc.reset_mock()
    res_prv = repo.save_provider("prv_test_001", {
        "name": "Coimbatore Circular Fibres",
        "provider_type": "recycler",
        "rating": 4.8,
    })
    assert res_prv["id"] == "prv_test_001"
    assert res_prv["provider_type"] == "recycler"
    mock_doc.set.assert_called_once()

    # Test save material
    mock_doc.reset_mock()
    res_mtl = repo.save_material("mtl_test_001", {
        "name": "Recycled Cotton Yarn",
        "price_inr_per_t": 85000.0,
    })
    assert res_mtl["id"] == "mtl_test_001"
    assert res_mtl["price_inr_per_t"] == 85000.0
    mock_doc.set.assert_called_once()

    # Test save rfq
    mock_doc.reset_mock()
    res_rfq = repo.save_rfq("rfq_test_001", {
        "title": "VFD retrofit tender",
        "status": "OPEN",
    })
    assert res_rfq["id"] == "rfq_test_001"
    assert res_rfq["status"] == "OPEN"
    mock_doc.set.assert_called_once()

    # Test save activity record (telemetry / SCADA)
    mock_doc.reset_mock()
    res_act = repo.save_activity_record("act_test_001", {
        "factory_id": "fac_test_456",
        "stream_kind": "electricity",
        "quantity": 15400.0,
        "unit": "kWh",
    })
    assert res_act["id"] == "act_test_001"
    assert res_act["quantity"] == 15400.0
    mock_doc.set.assert_called_once()


def test_firestore_storage_backend():
    import io
    from app.services import storage

    mock_client = mock.MagicMock()
    mock_doc = mock.MagicMock()
    mock_client.collection.return_value.document.return_value = mock_doc

    with mock.patch("app.core.firestore_db.get_firestore_client", return_value=mock_client), \
         mock.patch("app.core.config.settings.storage_backend", "firestore"):
        stream = io.BytesIO(b"DCS Meter Readings - 2026-09-13")
        stored = storage.store(stream, content_type="application/pdf", organization_id="org_test", document_id="doc_meter_01")
        assert stored.storage_backend == "firestore"
        assert stored.size_bytes > 0
        mock_doc.set.assert_called_once()


