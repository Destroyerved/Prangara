"""Marketplace DTOs: providers, RFQs, quotes, material listings."""
from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import Field, field_validator

from app.models.marketplace import PROVIDER_TYPES, QUOTE_STATUSES
from app.schemas.common import ApiModel


class ProviderCreate(ApiModel):
    name: str = Field(min_length=1, max_length=200)
    provider_type: str
    description: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    website: str | None = None
    state: str | None = None
    district: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    service_states: list[str] = Field(default_factory=list)
    service_radius_km: float | None = Field(default=None, gt=0)
    certifications: list[str] = Field(default_factory=list)
    typical_lead_time_days: int | None = Field(default=None, ge=0)

    @field_validator("provider_type")
    @classmethod
    def _type(cls, v: str) -> str:
        if v not in PROVIDER_TYPES:
            raise ValueError(f"provider_type must be one of {', '.join(PROVIDER_TYPES)}")
        return v


class ProviderOut(ProviderCreate):
    id: str
    organization_id: str
    verification_status: str
    verified_at: dt.datetime | None = None
    rating: float | None = None
    rating_count: int
    accepting_work: bool
    is_demo_seed: bool
    created_at: dt.datetime


class ProviderMatch(ApiModel):
    provider: ProviderOut
    score: float
    reasons: list[str]
    distance_km: float | None = None
    indicative_price_inr: float | None = None
    matched_service_id: str | None = None


class ProviderServiceIn(ApiModel):
    category: str = Field(min_length=1, max_length=48)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    intervention_ids: list[str] = Field(default_factory=list)
    indicative_price_inr: float | None = Field(default=None, ge=0)
    price_basis: str | None = None
    warranty_months: int | None = Field(default=None, ge=0)
    lead_time_days: int | None = Field(default=None, ge=0)


class ProviderServiceOut(ProviderServiceIn):
    id: str
    provider_id: str
    is_active: bool


class RFQCreate(ApiModel):
    factory_id: str
    intervention_id: str
    title: str = Field(min_length=1, max_length=240)
    scope_of_work: str | None = None
    action_id: str | None = None
    provider_ids: list[str] = Field(default_factory=list)
    needed_by: dt.date | None = None


class RFQOut(ApiModel):
    id: str
    factory_id: str
    intervention_id: str
    title: str
    scope_of_work: str | None = None
    status: str
    needed_by: dt.date | None = None
    accepted_quote_id: str | None = None
    shared_context: dict[str, Any] = Field(default_factory=dict)
    invited_provider_ids: list[str] = Field(default_factory=list)
    quote_count: int = 0
    created_at: dt.datetime


class QuoteCreate(ApiModel):
    price_inr: float = Field(gt=0)
    installation_included: bool = False
    installation_inr: float | None = Field(default=None, ge=0)
    annual_opex_delta_inr: float | None = None
    warranty_months: int | None = Field(default=None, ge=0)
    delivery_days: int | None = Field(default=None, ge=0)
    validity_days: int | None = Field(default=None, ge=0)
    notes: str | None = None


class QuoteOut(QuoteCreate):
    id: str
    rfq_id: str
    provider_id: str
    provider_name: str | None = None
    status: str
    revised_payback_yrs: float | None = None
    revised_lcoa_inr_per_tco2e: float | None = None
    comparison: dict[str, Any] = Field(default_factory=dict)
    created_at: dt.datetime

    @field_validator("status")
    @classmethod
    def _status(cls, v: str) -> str:
        if v not in QUOTE_STATUSES:
            raise ValueError(f"status must be one of {', '.join(QUOTE_STATUSES)}")
        return v


class QuoteComparison(ApiModel):
    rfq: RFQOut
    quotes: list[QuoteOut]
    engine_estimate: dict[str, Any] = Field(default_factory=dict)
    note: str


class MaterialListingIn(ApiModel):
    name: str = Field(min_length=1, max_length=200)
    material_key: str | None = None
    grade: str | None = None
    recycled_content_pct: float | None = Field(default=None, ge=0, le=100)
    embodied_factor_key: str | None = None
    embodied_tco2e_per_t: float | None = Field(default=None, ge=0)
    embodied_source: str | None = None
    price_inr_per_t: float | None = Field(default=None, ge=0)
    moq_t: float | None = Field(default=None, ge=0)
    stock_t: float | None = Field(default=None, ge=0)
    certifications: list[str] = Field(default_factory=list)
    state: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class MaterialListingOut(MaterialListingIn):
    id: str
    provider_id: str
    provider_name: str | None = None
    is_active: bool
    is_demo_seed: bool
    created_at: dt.datetime
