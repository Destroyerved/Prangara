"""
Tests for Local Ollama Integration (OllamaService, status endpoint, and fallbacks).
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.services.ollama_service import OllamaService, get_ollama_service


def test_ollama_service_live_status() -> None:
    svc = get_ollama_service()
    assert svc.base_url.startswith("http")

    # If the user has Ollama running locally:
    is_up = svc.is_available()
    status = svc.get_status()
    assert "available" in status
    assert "installed_models" in status
    assert "active_model" in status

    if is_up:
        assert status["available"] is True
        assert len(status["installed_models"]) > 0
        assert "llama3:latest" in status["installed_models"] or "gemma4:latest" in status["installed_models"]


def test_ollama_api_endpoint(client: TestClient) -> None:
    res = client.get("/api/llm/status")
    assert res.status_code == 200
    data = res.json()
    assert "available" in data
    assert "base_url" in data
    assert "installed_models" in data


def test_ollama_chat_completion() -> None:
    svc = get_ollama_service()
    if not svc.is_available():
        return  # Skip live inference if daemon is stopped

    reply = svc.chat(
        [
            {"role": "system", "content": "You are a helpful assistant. Be concise."},
            {"role": "user", "content": "Write the exact word PRANGARA."},
        ],
        temperature=0.0,
        timeout=10.0,
    )
    assert reply is not None
    assert len(reply.strip()) > 0
    assert "PRANGARA" in reply.upper()


def test_ollama_offline_graceful_fallback() -> None:
    # Point service at a non-existent port
    dummy = OllamaService(base_url="http://127.0.0.1:59999", default_model="dummy:model")
    assert dummy.is_available(timeout=0.2) is False
    assert dummy.list_installed_models(timeout=0.2) == []
    # Chat must return None rather than raising an unhandled exception
    res = dummy.chat([{"role": "user", "content": "hello"}], timeout=0.2)
    assert res is None
    # RAG synthesis must return None
    synth = dummy.synthesize_rag_answer("test question", [], timeout=0.2)
    assert synth is None
    # Visual analysis must return None
    vlm_res = dummy.analyze_image(b"\x89PNG\r\n\x1a\n", "analyze", timeout=0.2)
    assert vlm_res is None
    eq_res = dummy.extract_equipment_from_image(b"\x89PNG\r\n\x1a\n", "motor.png")
    assert eq_res is None
    doc_res = dummy.extract_document_from_image(b"\x89PNG\r\n\x1a\n", "bill.png")
    assert doc_res is None


def test_is_image_detector() -> None:
    from app.services.ollama_service import is_image

    # Valid magic byte headers
    assert is_image(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR") is True
    assert is_image(b"\xff\xd8\xff\xe0\x00\x10JFIF") is True
    assert is_image(b"RIFF\x20\x00\x00\x00WEBPVP8 ") is True
    assert is_image(b"GIF89a\x01\x00\x01\x00") is True
    assert is_image(b"BM\x36\x00\x00\x00") is True
    assert is_image(b"II*\x00\x08\x00\x00\x00") is True
    assert is_image(b"MM\x00*\x00\x00\x00\x08") is True

    # Non-images
    assert is_image(b"ABB Induction Motor 75 kW") is False
    assert is_image(b"%PDF-1.4 electricity bill") is False
    assert is_image(b"") is False
    assert is_image(b"abc") is False


def test_vlm_equipment_extraction_mock(monkeypatch) -> None:
    from app.services.ollama_service import get_ollama_service
    from app.services.intake_extract import extract_equipment_content

    svc = get_ollama_service()
    mock_json = """
    {
      "rated_power_kw": 55.0,
      "rated_voltage_v": 415,
      "rpm": 1475,
      "efficiency_class": "IE3",
      "equipment_type": "Induction Motor",
      "manufacturer": "Siemens"
    }
    """

    monkeypatch.setattr(svc, "is_available", lambda: True)
    monkeypatch.setattr(svc, "analyze_image", lambda *args, **kwargs: mock_json)

    dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    res = extract_equipment_content(dummy_png, "siemens_motor.png")

    assert res["extractor"] == "vlm"
    assert "Siemens" in res["extractor_detail"] or "VLM" in res["extractor_detail"]
    fields = {f["field"]: f["value"] for f in res["fields"]}
    assert fields["rated_power_kw"] == 55.0
    assert fields["rated_voltage_v"] == 415
    assert fields["rated_rpm"] == 1475
    assert fields["efficiency_class"] == "IE3"
    assert fields["equipment_type"] == "Induction Motor"
    assert fields["manufacturer"] == "Siemens"
    assert all(f["needs_confirmation"] is True for f in res["fields"])


def test_vlm_document_extraction_mock(monkeypatch) -> None:
    from app.services.ollama_service import get_ollama_service
    from app.services.intake_extract import extract_document_content

    svc = get_ollama_service()
    mock_json = """
    {
      "quantity": 88500.0,
      "unit": "kWh",
      "cost_inr": 725000.0,
      "tariff_rate": 8.19,
      "period_start": "2024-04-01",
      "period_end": "2024-04-30"
    }
    """

    monkeypatch.setattr(svc, "is_available", lambda: True)
    monkeypatch.setattr(svc, "analyze_image", lambda *args, **kwargs: mock_json)

    dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    res = extract_document_content(dummy_png, "discom_bill.png", "electricity_bill")

    assert res["extractor"] == "vlm"
    fields = {f["field"]: f["value"] for f in res["fields"]}
    assert fields["electricity_kwh"] == 88500.0
    assert fields["tariff_inr_per_kwh"] == 8.19
    assert len(res["suggested_activity_records"]) == 1
    rec = res["suggested_activity_records"][0]
    assert rec["stream_kind"] == "electricity"
    assert rec["quantity"] == 88500.0
    assert rec["data_state"] == "extracted_unverified"

