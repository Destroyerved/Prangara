"""
RAG Assistant and sovereign source registry endpoints. PRD FR-53; DATA_RAG_COMPLIANCE sections 18-22.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.core.errors import NotFound
from app.schemas.assistant import AskRequest, AskResponse, SourceDetail
from app.services.rag_service import get_rag_service

router = APIRouter(prefix="/api", tags=["assistant"])


@router.post("/assistant/ask", response_model=AskResponse)
def ask_assistant(body: AskRequest) -> AskResponse:
    """Query sovereign statutory knowledge base with grounded SHA-256 citations."""
    rag = get_rag_service()
    res = rag.ask(body.question, topic=body.topic)
    return AskResponse.model_validate(res)


@router.get("/sources/{source_id}", response_model=SourceDetail)
def get_source(source_id: str) -> SourceDetail:
    """Inspect verified source provenance, authority class, and canonical URL."""
    rag = get_rag_service()
    source = rag.get_source(source_id)
    if source is None:
        raise NotFound(f"Source '{source_id}' not found in sovereign registry.")
    return SourceDetail.model_validate(source)


@router.get("/sources", response_model=list[SourceDetail])
def list_sources() -> list[SourceDetail]:
    """List all registered sovereign statutory sources."""
    rag = get_rag_service()
    return [SourceDetail.model_validate(s) for s in rag.list_sources()]


@router.get("/llm/status")
def get_llm_status() -> dict[str, Any]:
    """Inspect local Ollama runtime availability, installed models, and active model."""
    from app.services.ollama_service import get_ollama_service

    return get_ollama_service().get_status()

