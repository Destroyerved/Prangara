"""
Factory, site, profile, activity and asset DTOs.

`PlantProfileIn` is the contract between the platform and the deterministic
engine. It is the one shape the engine accepts, and every intake route -
form, conversation, OCR, equipment scan - has to produce it. Keeping it
explicit here means an LLM extraction that invents a field fails validation
instead of reaching the engine.
"""
from __future__ import annotations

import datetime as dt

from pydantic import Field, field_validator, model_validator

from app.models.factory import DATA_STATES, STREAM_KINDS
from app.schemas.common import ApiModel


class PlantProfileIn(ApiModel):
    """Exactly what `engine.assess()` consumes. Field names are engine-defined."""

    name: str = "Unnamed plant"
    sector: str
    state: str | None = None
    annual_output_t: float = Field(default=0, ge=0)
    annual_revenue_cr: float = Field(default=0, ge=0)
    employees: int = Field(default=0, ge=0)
    electricity_kwh: float = Field(default=0, ge=0)
    fuels: dict[str, float] = Field(default_factory=dict)
    materials: dict[str, float] = Field(default_factory=dict)
    waste: dict[str, float] = Field(default_factory=dict)
    freight: dict[str, float] = Field(default_factory=dict)
    eu_export_share_pct: float = Field(default=0, ge=0, le=100)
    tariff_inr_per_kwh: float | None = Field(default=None, gt=0)
    discount_rate: float | None = Field(default=None, ge=0, lt=1)

    @model_validator(mode="after")
    def _no_negative_quantities(self) -> "PlantProfileIn":
        # DATA_RAG_COMPLIANCE section 32: a negative activity quantity is not a
        # small data problem, it is an invalid inventory. Fail loudly here
        # rather than letting it become a negative emission downstream.
        for label, mapping in (
            ("fuels", self.fuels), ("materials", self.materials),
            ("waste", self.waste), ("freight", self.freight),
        ):
            for key, value in mapping.items():
                if value < 0:
                    raise ValueError(f"{label}.{key} cannot be negative")
        return self


class FactoryCreate(ApiModel):
    name: str = Field(min_length=1, max_length=200)
    sector: str
    subsector: str | None = None
    state: str | None = None
    district: str | None = None
    cluster: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class FactoryUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    subsector: str | None = None
    state: str | None = None
    district: str | None = None
    cluster: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class FactoryOut(ApiModel):
    id: str
    organization_id: str
    name: str
    sector: str
    subsector: str | None = None
    state: str | None = None
    district: str | None = None
    cluster: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    created_at: dt.datetime
    updated_at: dt.datetime


class FactorySummary(FactoryOut):
    """Factory plus its latest headline, for list screens."""

    latest_assessment_id: str | None = None
    latest_assessed_at: dt.datetime | None = None
    total_tco2e: float | None = None
    scope3_tco2e: float | None = None
    critical_leak_count: int | None = None
    cash_positive_benefit_inr: float | None = None
    open_action_count: int = 0
    data_quality_score: float | None = None


class SiteCreate(ApiModel):
    name: str = Field(min_length=1, max_length=200)
    address: str | None = None
    state: str | None = None
    district: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    is_primary: bool = False


class SiteOut(SiteCreate):
    id: str
    factory_id: str
    created_at: dt.datetime


class ProfileUpsert(ApiModel):
    label: str = "Current period"
    site_id: str | None = None
    period_start: dt.date | None = None
    period_end: dt.date | None = None
    annual_output_t: float = Field(default=0, ge=0)
    output_unit: str = "tonne"
    annual_revenue_cr: float = Field(default=0, ge=0)
    employees: int = Field(default=0, ge=0)
    operating_days: int | None = Field(default=None, ge=0, le=366)
    shifts_per_day: int | None = Field(default=None, ge=0, le=4)
    export_share_pct: float = Field(default=0, ge=0, le=100)
    eu_export_share_pct: float = Field(default=0, ge=0, le=100)
    tariff_inr_per_kwh: float | None = Field(default=None, gt=0)
    discount_rate: float | None = Field(default=None, ge=0, lt=1)
    field_states: dict[str, str] = Field(default_factory=dict)
    is_draft: bool = True
    notes: str | None = None

    @model_validator(mode="after")
    def _periods_and_shares(self) -> "ProfileUpsert":
        if self.period_start and self.period_end and self.period_end < self.period_start:
            raise ValueError("period_end cannot be before period_start")
        if self.eu_export_share_pct > self.export_share_pct and self.export_share_pct > 0:
            raise ValueError("eu_export_share_pct cannot exceed export_share_pct")
        return self

    @field_validator("field_states")
    @classmethod
    def _states(cls, v: dict[str, str]) -> dict[str, str]:
        bad = sorted(set(v.values()) - set(DATA_STATES))
        if bad:
            raise ValueError(f"unknown data state(s): {', '.join(bad)}")
        return v


class ProfileOut(ProfileUpsert):
    id: str
    factory_id: str
    created_at: dt.datetime
    updated_at: dt.datetime


class ActivityRecordIn(ApiModel):
    stream_kind: str
    factor_key: str | None = None
    label: str | None = None
    quantity: float = Field(ge=0)
    unit: str = ""
    period_start: dt.date | None = None
    period_end: dt.date | None = None
    data_state: str = "DECLARED"
    source_kind: str = "manual"
    extraction_confidence: float | None = Field(default=None, ge=0, le=1)
    unit_cost_inr: float | None = Field(default=None, ge=0)
    notes: str | None = None

    @field_validator("stream_kind")
    @classmethod
    def _stream(cls, v: str) -> str:
        if v not in STREAM_KINDS:
            raise ValueError(f"stream_kind must be one of {', '.join(STREAM_KINDS)}")
        return v

    @field_validator("data_state")
    @classmethod
    def _state(cls, v: str) -> str:
        if v not in DATA_STATES:
            raise ValueError(f"data_state must be one of {', '.join(DATA_STATES)}")
        return v


class ActivityRecordOut(ActivityRecordIn):
    id: str
    profile_id: str
    factory_id: str
    confirmed_at: dt.datetime | None = None
    created_at: dt.datetime
    updated_at: dt.datetime


class AssetIn(ApiModel):
    asset_type: str = Field(min_length=1, max_length=48)
    name: str = Field(min_length=1, max_length=200)
    site_id: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    serial_number: str | None = None
    rated_power_kw: float | None = Field(default=None, ge=0)
    rated_capacity: float | None = Field(default=None, ge=0)
    capacity_unit: str | None = None
    efficiency_pct: float | None = Field(default=None, gt=0, le=100)
    year_installed: int | None = Field(default=None, ge=1900, le=2100)
    energy_type: str | None = None
    fuel_factor_key: str | None = None
    operating_hours_per_year: float | None = Field(default=None, ge=0, le=8784)
    load_factor: float | None = Field(default=None, gt=0, le=1)
    maintenance_status: str | None = None
    data_state: str = "DECLARED"


class AssetOut(AssetIn):
    id: str
    factory_id: str
    estimated_annual_kwh: float | None = None
    estimated_annual_tco2e: float | None = None
    estimate_basis: str | None = None
    confidence: str
    created_at: dt.datetime
    updated_at: dt.datetime
