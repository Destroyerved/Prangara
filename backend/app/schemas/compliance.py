"""
Compliance case DTOs. PRD FR-46, FR-49.

Wording rules from DATA_RAG_COMPLIANCE section 34 apply to every string that
leaves this module: readiness, risk, evidence gap, action required, screening,
indicative, human review. Never "compliant", "certified" or "approved" — those
words claim a determination no part of this platform is authorised to make.

The rule that shapes the split of ownership: BE-1 stores the verdict and who is
accountable for it; BE-2 decides the verdict. So nothing here evaluates a rule,
and `rule_id` / `rule_pack_version` are required fields rather than optional
decoration — a case with no rule behind it is an opinion, not a finding.
"""
from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import Field, field_validator, model_validator

from app.models.governance import CASE_FLOW, COMPLIANCE_STATUSES
from app.schemas.common import ApiModel

CASE_SEVERITIES = ("low", "medium", "high", "critical")
CORRECTIVE_STATUSES = ("OPEN", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED")


class CorrectiveActionIn(ApiModel):
    title: str = Field(min_length=1, max_length=240)
    description: str | None = None
    assigned_user_id: str | None = None
    due_date: dt.date | None = None


class CorrectiveActionPatch(ApiModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = None
    assigned_user_id: str | None = None
    due_date: dt.date | None = None
    status: str | None = None

    @field_validator("status")
    @classmethod
    def _status(cls, v: str | None) -> str | None:
        if v is not None and v not in CORRECTIVE_STATUSES:
            raise ValueError(f"status must be one of {', '.join(CORRECTIVE_STATUSES)}")
        return v


class CorrectiveActionOut(ApiModel):
    id: str
    case_id: str
    title: str
    description: str | None = None
    assigned_user_id: str | None = None
    due_date: dt.date | None = None
    status: str
    completed_at: dt.datetime | None = None
    created_at: dt.datetime
    updated_at: dt.datetime
    is_overdue: bool = False


class ComplianceCaseCreate(ApiModel):
    """Creating a case by hand.

    Normally the evaluator writes these. A compliance officer can also open one
    from a review, which is why the route exists — but it still demands the rule
    and the pack version it rests on.
    """

    factory_id: str
    rule_id: str = Field(min_length=1, max_length=64)
    rule_pack: str = Field(min_length=1, max_length=48)
    rule_pack_version: str = Field(min_length=1, max_length=32)
    title: str = Field(min_length=1, max_length=240)
    reason: str | None = None
    severity: str = "medium"
    status: str = "ACTION_REQUIRED"
    requires_human_review: bool = False
    source_ids: list[str] = Field(default_factory=list)
    required_evidence: list[str] = Field(default_factory=list)
    assessment_id: str | None = None
    owner_user_id: str | None = None
    due_date: dt.date | None = None

    @field_validator("severity")
    @classmethod
    def _severity(cls, v: str) -> str:
        if v not in CASE_SEVERITIES:
            raise ValueError(f"severity must be one of {', '.join(CASE_SEVERITIES)}")
        return v

    @field_validator("status")
    @classmethod
    def _status(cls, v: str) -> str:
        if v not in COMPLIANCE_STATUSES:
            raise ValueError(f"status must be one of {', '.join(COMPLIANCE_STATUSES)}")
        return v

    @model_validator(mode="after")
    def _high_severity_needs_review(self) -> "ComplianceCaseCreate":
        # PRD section 29: high-severity cases require human review. Set it here
        # rather than hoping every caller remembers.
        if self.severity in ("high", "critical"):
            self.requires_human_review = True
        return self


class ComplianceCasePatch(ApiModel):
    status: str | None = None
    flow_state: str | None = None
    severity: str | None = None
    owner_user_id: str | None = None
    reviewer_user_id: str | None = None
    due_date: dt.date | None = None
    reason: str | None = None
    required_evidence: list[str] | None = None

    @field_validator("status")
    @classmethod
    def _status(cls, v: str | None) -> str | None:
        if v is not None and v not in COMPLIANCE_STATUSES:
            raise ValueError(f"status must be one of {', '.join(COMPLIANCE_STATUSES)}")
        return v

    @field_validator("flow_state")
    @classmethod
    def _flow(cls, v: str | None) -> str | None:
        if v is not None and v not in CASE_FLOW:
            raise ValueError(f"flow_state must be one of {', '.join(CASE_FLOW)}")
        return v

    @field_validator("severity")
    @classmethod
    def _severity(cls, v: str | None) -> str | None:
        if v is not None and v not in CASE_SEVERITIES:
            raise ValueError(f"severity must be one of {', '.join(CASE_SEVERITIES)}")
        return v


class CloseCaseRequest(ApiModel):
    reason: str = Field(min_length=8, max_length=2000)
    evidence_ids: list[str] = Field(default_factory=list)


class ComplianceCaseOut(ApiModel):
    id: str
    factory_id: str
    organization_id: str
    assessment_id: str | None = None
    rule_id: str
    rule_pack: str
    rule_pack_version: str
    source_ids: list[str] = Field(default_factory=list)
    severity: str
    status: str
    flow_state: str
    requires_human_review: bool
    title: str
    reason: str | None = None
    required_evidence: list[str] = Field(default_factory=list)
    owner_user_id: str | None = None
    reviewer_user_id: str | None = None
    due_date: dt.date | None = None
    closed_at: dt.datetime | None = None
    closed_reason: str | None = None
    created_at: dt.datetime
    updated_at: dt.datetime

    is_overdue: bool = False
    evidence_count: int = 0
    corrective_actions: list[CorrectiveActionOut] = Field(default_factory=list)


class ReadinessItem(ApiModel):
    """One line of the readiness view.

    `status` is a readiness state, never a legal determination. `basis` says
    where it came from so the UI never has to guess whether a line is engine
    output, an evidence check or a stored case.
    """

    key: str
    label: str
    status: str
    detail: str | None = None
    basis: str
    open_case_count: int = 0


class ComplianceReadiness(ApiModel):
    factory_id: str
    assessment_id: str | None = None
    evaluated_at: dt.datetime | None = None
    overall: str
    items: list[ReadinessItem]
    open_cases: int
    overdue_cases: int
    human_review_required: int
    engine_panel: dict[str, Any] = Field(default_factory=dict)
    rule_packs_evaluated: list[str] = Field(default_factory=list)
    caveat: str


class EvaluateRequest(ApiModel):
    factory_id: str
    assessment_id: str | None = None
