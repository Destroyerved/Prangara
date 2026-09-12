"""
Schemas for the RAG assistant and source registry inspection.
"""
from __future__ import annotations

from pydantic import Field

from app.schemas.common import ApiModel


class AskRequest(ApiModel):
    question: str = Field(min_length=3, max_length=1000)
    factory_id: str | None = None
    topic: str | None = None


class Citation(ApiModel):
    source_id: str
    title: str | None = None
    publisher: str | None = None
    page: str | None = None
    section: str | None = None
    url: str | None = None
    jurisdiction: str | None = None
    effective_date: str | None = None
    sha256_hash: str | None = None
    badge: str | None = None


class AskResponse(ApiModel):
    answer: str
    confidence: str = Field(description="high | medium | low")
    citations: list[Citation] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class SourceDetail(ApiModel):
    source_id: str
    agency: str | None = None
    dataset_name: str | None = None
    source_type: str | None = None
    authority_class: str | None = None
    jurisdiction: str | None = None
    canonical_url: str | None = None
    license: str | None = None
    notes: str | None = None
