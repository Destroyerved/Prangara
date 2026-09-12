"""Assessment, scenario and action DTOs."""
from __future__ import annotations

import datetime as dt
from typing import Any, Literal

from pydantic import Field, model_validator

from app.models.action import ACTION_STATUSES
from app.schemas.common import ApiModel


class RunAssessmentRequest(ApiModel):
    label: str | None = Field(default=None, max_length=160)
    profile_id: str | None = None


class AssessmentSummary(ApiModel):
    id: str
    factory_id: str
    label: str | None = None
    is_baseline: bool
    created_at: dt.datetime
    total_tco2e: float | None = None
    total_low_tco2e: float | None = None
    total_high_tco2e: float | None = None
    scope1_tco2e: float | None = None
    scope2_tco2e: float | None = None
    scope3_tco2e: float | None = None
    leak_count: int | None = None
    critical_leak_count: int | None = None
    cash_positive_abatement_tco2e: float | None = None
    cash_positive_benefit_inr: float | None = None
    cash_positive_capex_inr: float | None = None
    data_quality_score: float | None = None
    version_stamp: dict[str, Any] = Field(default_factory=dict)


class AssessmentDetail(AssessmentSummary):
    """Summary plus the full engine payload.

    `result` is intentionally untyped here. It is the engine's own contract and
    mirroring its 200-odd fields in Pydantic would create a second definition
    that drifts. The engine's shape is documented in docs/14-API-REFERENCE.md
    and pinned by the engine tests.
    """

    engine_profile: dict[str, Any]
    result: dict[str, Any]


class ScenarioModification(ApiModel):
    """One declarative change applied to a baseline profile. PRD FR-34.

    Deliberately a small closed set. A free-form patch would let the client
    write any number into the engine input, which is exactly the door PRD
    section 3.1 closes.
    """

    kind: Literal[
        "electricity_efficiency_pct",
        "solar_share_pct",
        "recycled_material_pct",
        "fuel_switch",
        "logistics_mode_shift_pct",
        "waste_recovery_pct",
        "output_change_pct",
    ]
    value: float
    target_key: str | None = None
    replacement_key: str | None = None

    @model_validator(mode="after")
    def _check(self) -> "ScenarioModification":
        if self.kind in ("electricity_efficiency_pct", "solar_share_pct",
                         "recycled_material_pct", "logistics_mode_shift_pct",
                         "waste_recovery_pct") and not 0 <= self.value <= 100:
            raise ValueError(f"{self.kind} must be a percentage between 0 and 100")
        if self.kind == "fuel_switch" and not (self.target_key and self.replacement_key):
            raise ValueError("fuel_switch needs target_key and replacement_key")
        if self.kind in ("recycled_material_pct",) and not self.target_key:
            raise ValueError("recycled_material_pct needs target_key (the material to substitute)")
        return self


class ScenarioCreate(ApiModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    baseline_assessment_id: str | None = None
    modifications: list[ScenarioModification] = Field(default_factory=list)


class ScenarioOut(ApiModel):
    id: str
    factory_id: str
    name: str
    description: str | None = None
    baseline_assessment_id: str | None = None
    latest_assessment_id: str | None = None
    modifications: dict[str, Any]
    created_at: dt.datetime


class ScenarioComparison(ApiModel):
    scenario: ScenarioOut
    baseline: AssessmentSummary | None
    result: AssessmentSummary
    delta_tco2e: float | None = None
    delta_pct: float | None = None
    unsupported: list[str] = Field(default_factory=list)


class ActionOut(ApiModel):
    id: str
    factory_id: str
    intervention_id: str
    name: str
    category: str | None = None
    target_stream: str | None = None
    status: str
    expected_abatement_tco2e: float | None = None
    expected_capex_inr: float | None = None
    expected_annual_benefit_inr: float | None = None
    expected_payback_yrs: float | None = None
    expected_lcoa_inr_per_tco2e: float | None = None
    actual_abatement_tco2e: float | None = None
    actual_capex_inr: float | None = None
    actual_annual_benefit_inr: float | None = None
    was_blocked: bool
    was_capped: bool
    restriction_note: str | None = None
    target_date: dt.date | None = None
    completed_at: dt.datetime | None = None
    verified_at: dt.datetime | None = None
    notes: str | None = None
    created_at: dt.datetime
    updated_at: dt.datetime


class ActionPatch(ApiModel):
    status: str | None = None
    actual_abatement_tco2e: float | None = Field(default=None, ge=0)
    actual_capex_inr: float | None = Field(default=None, ge=0)
    actual_annual_benefit_inr: float | None = None
    target_date: dt.date | None = None
    owner_user_id: str | None = None
    rejected_reason: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def _status(self) -> "ActionPatch":
        if self.status is not None and self.status not in ACTION_STATUSES:
            raise ValueError(f"status must be one of {', '.join(ACTION_STATUSES)}")
        if self.status == "REJECTED" and not self.rejected_reason:
            raise ValueError("rejected_reason is required when rejecting an action")
        return self


class VerificationPeriodIn(ApiModel):
    period_start: dt.date
    period_end: dt.date
    normalisation: dict[str, Any] = Field(default_factory=dict)
    notes: str | None = None

    @model_validator(mode="after")
    def _order(self) -> "VerificationPeriodIn":
        if self.period_end < self.period_start:
            raise ValueError("period_end cannot be before period_start")
        return self


class VerificationResultIn(ApiModel):
    metric: str
    unit: str = ""
    baseline_value: float | None = None
    expected_value: float | None = None
    actual_value: float | None = None
    confidence: str = "medium"
    assumptions: str | None = None


class VerificationResultOut(VerificationResultIn):
    id: str
    period_id: str
    achievement_pct: float | None = None


class VerificationPeriodOut(VerificationPeriodIn):
    id: str
    action_id: str
    factory_id: str
    status: str
    results: list[VerificationResultOut] = Field(default_factory=list)
