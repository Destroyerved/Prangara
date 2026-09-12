"""
Shared DTO conventions.

task.md section 3 names `packages/contracts` as the single source of shared
field names. Backend owns the Pydantic models; the web and mobile clients
consume types generated from the OpenAPI schema these produce
(`scripts/export_openapi.py`). No client may define a second spelling of a field
that already exists here.
"""
from __future__ import annotations

import datetime as dt
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ApiModel(BaseModel):
    """Base for every response model. Reads straight off ORM objects."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Page(ApiModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


class Ok(ApiModel):
    ok: bool = True
    message: str | None = None


class Band(ApiModel):
    """low/base/high, the engine's uncertainty triple. PRD FR-13."""

    low: float
    base: float
    high: float


class SourceRef(ApiModel):
    """Provenance attached to any number a user can question. PRD section 3.2."""

    source_id: str | None = None
    title: str | None = None
    url: str | None = None
    version: str | None = None
    published_date: dt.date | None = None
    authority_level: str | None = None


class HealthResponse(ApiModel):
    status: str
    app: str
    version: str
    environment: str
    database: str
    engine: dict[str, Any]
    counts: dict[str, int]
    features: dict[str, bool]


class ErrorBody(ApiModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
