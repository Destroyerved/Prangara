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
