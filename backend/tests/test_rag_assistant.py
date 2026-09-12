"""
Tests for Grounded Sovereign RAG Assistant and source registry (B3).
"""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_rag_grounded_answer_grid_factors(client: TestClient) -> None:
    res = client.post("/api/assistant/ask", json={
        "question": "What is the official weighted average emission factor for the Indian national electricity grid?",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["confidence"] in ("high", "medium")
    assert "0.716" in data["answer"]
    assert len(data["citations"]) > 0

    cea_citation = next((c for c in data["citations"] if "CEA" in c["source_id"]), None)
    assert cea_citation is not None
    assert cea_citation["url"] is not None
    assert cea_citation["sha256_hash"] is not None
    assert "OFFICIAL · SHA-256:" in cea_citation["badge"]


def test_rag_cbam_query(client: TestClient) -> None:
    res = client.post("/api/assistant/ask", json={
        "question": "What are the EU CBAM rules and default benchmarks for steel export goods?",
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["citations"]) > 0
    assert any("CBAM" in c["source_id"] for c in data["citations"])


def test_rag_hallucination_rejection(client: TestClient) -> None:
    # Completely out-of-scope query must be rejected
    res = client.post("/api/assistant/ask", json={
        "question": "What is the secret recipe for baking sourdough chocolate cake?",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["answer"] == "I cannot support that answer from the currently approved source set."
    assert data["confidence"] == "low"
    assert data["citations"] == []


def test_source_registry_endpoints(client: TestClient) -> None:
    # 1. Get single source
    res_src = client.get("/api/sources/SRC-CEA-V21")
    assert res_src.status_code == 200
    src_data = res_src.json()
    assert src_data["source_id"] == "SRC-CEA-V21"
    assert "Central Electricity Authority" in src_data["agency"]
    assert "cea.nic.in" in src_data["canonical_url"]

    # 2. List all sources
    res_list = client.get("/api/sources")
    assert res_list.status_code == 200
    sources = res_list.json()
    assert len(sources) >= 5
    source_ids = {s["source_id"] for s in sources}
    assert "SRC-CEA-V21" in source_ids
    assert "SRC-DESNZ-2026" in source_ids

    # 3. Not found
    assert client.get("/api/sources/NON_EXISTENT_SRC").status_code == 404
