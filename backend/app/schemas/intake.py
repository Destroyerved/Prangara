"""
Intake DTOs: conversational onboarding, bill scan, equipment scan.

PRD FR-04, FR-05, FR-06. The pipeline is always the same shape:

    raw input -> extraction -> schema validation -> user confirmation -> record

`ExtractedField` is the unit that travels through it. Every extracted value
carries where it came from and how confident the extractor was, because
PRD section 29 requires the user to confirm critical extracted values and they
cannot do that if the UI cannot tell them what was guessed.
"""
from __future__ import annotations

import datetime as dt
from typing import Any, Literal

from pydantic import Field

from app.schemas.common import ApiModel
from app.schemas.factory import ActivityRecordIn


class ExtractedField(ApiModel):
    field: str
    value: Any
    unit: str | None = None
    confidence: float = Field(ge=0, le=1)
    # Where in the source this came from: a quote from the message, or a bill
    # line. Lets the UI show the user what it read.
    evidence_text: str | None = None
    needs_confirmation: bool = True


class ConversationExtractRequest(ApiModel):
    message: str = Field(min_length=1, max_length=4000)
    factory_id: str | None = None
    sector: str | None = None
    known: dict[str, Any] = Field(default_factory=dict)


class ConversationExtractResponse(ApiModel):
    extractor: Literal["llm", "rule_based"]
    extractor_detail: str
    fields: list[ExtractedField]
    missing_fields: list[str]
    follow_up_questions: list[str]
    warnings: list[str] = Field(default_factory=list)
    # Never the final word. The client must confirm before anything is written.
    requires_user_confirmation: bool = True


class ConfirmIntakeRequest(ApiModel):
    """Confirmed values, written to the profile and activity records."""

    profile_updates: dict[str, Any] = Field(default_factory=dict)
    activity_records: list[ActivityRecordIn] = Field(default_factory=list)
    evidence_id: str | None = None
    source_kind: Literal["conversation", "document_ocr", "equipment_scan", "manual"] = "manual"


class ConfirmIntakeResponse(ApiModel):
    profile_id: str
    created_activity_record_ids: list[str]
    updated_profile_fields: list[str]


class DocumentExtractResponse(ApiModel):
    evidence_id: str
    document_type: str | None = None
    extractor: Literal["ocr", "unavailable"]
    extractor_detail: str
    fields: list[ExtractedField] = Field(default_factory=list)
    suggested_activity_records: list[ActivityRecordIn] = Field(default_factory=list)
    period_start: dt.date | None = None
    period_end: dt.date | None = None
    requires_user_confirmation: bool = True
    warnings: list[str] = Field(default_factory=list)


class EquipmentExtractResponse(ApiModel):
    evidence_id: str | None = None
    extractor: Literal["ocr", "unavailable"]
    extractor_detail: str
    fields: list[ExtractedField] = Field(default_factory=list)
    # PRD FR-06 is explicit: a nameplate gives rated power, not consumption.
    # These are the questions that must be answered before an estimate exists.
    required_questions: list[str] = Field(default_factory=list)
    requires_user_confirmation: bool = True
