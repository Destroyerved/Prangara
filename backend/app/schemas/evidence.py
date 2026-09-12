"""Evidence vault DTOs."""
from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import Field, field_validator

from app.models.evidence import EVIDENCE_TYPES, LINK_TARGETS
from app.schemas.common import ApiModel


class EvidenceLinkIn(ApiModel):
    target_type: str
    target_id: str
    role: str | None = None

    @field_validator("target_type")
    @classmethod
    def _target(cls, v: str) -> str:
        if v not in LINK_TARGETS:
            raise ValueError(f"target_type must be one of {', '.join(LINK_TARGETS)}")
        return v


class EvidenceLinkOut(EvidenceLinkIn):
    id: str
    evidence_id: str
    created_at: dt.datetime


class EvidenceOut(ApiModel):
    id: str
    organization_id: str
    factory_id: str | None = None
    evidence_type: str
    title: str
    description: str | None = None
    filename: str
    content_type: str
    size_bytes: int
    content_sha256: str
    document_date: dt.date | None = None
    period_start: dt.date | None = None
    period_end: dt.date | None = None
    expires_at: dt.date | None = None
    verification_status: str
    verified_at: dt.datetime | None = None
    extraction: dict[str, Any] = Field(default_factory=dict)
    extraction_confidence: float | None = None
    uploaded_by_user_id: str | None = None
    created_at: dt.datetime
    links: list[EvidenceLinkOut] = Field(default_factory=list)
    download_url: str | None = None
    client_ref: str | None = None


class EvidenceUpdate(ApiModel):
    title: str | None = Field(default=None, max_length=240)
    description: str | None = None
    evidence_type: str | None = None
    document_date: dt.date | None = None
    period_start: dt.date | None = None
    period_end: dt.date | None = None
    expires_at: dt.date | None = None
    client_ref: str | None = None

    @field_validator("evidence_type")
    @classmethod
    def _type(cls, v: str | None) -> str | None:
        if v is not None and v not in EVIDENCE_TYPES:
            raise ValueError(f"evidence_type must be one of {', '.join(EVIDENCE_TYPES)}")
        return v
