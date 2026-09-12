"""
Providers, services, material listings, RFQs and quotes. PRD sections 14 and 18.

The access rule that shapes this file (FR-01): a provider organization must not
be able to read a manufacturer's assessment. So an RFQ carries a *copy* of the
handful of fields a provider legitimately needs to quote against - the
intervention, the target stream size, the site location - and never a foreign
key a provider could follow back into the assessment.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, id_column

PROVIDER_TYPES = (
    "equipment_seller", "installation_contractor", "esco", "energy_auditor",
    "recycled_material_supplier", "recycler", "transporter", "process_consultant",
    "maintenance_company", "shared_capacity_provider",
)

RFQ_STATUSES = (
    "DRAFT", "OPEN", "QUOTED", "SHORTLISTED", "ACCEPTED", "REJECTED", "COMPLETED",
)
QUOTE_STATUSES = ("SUBMITTED", "SHORTLISTED", "ACCEPTED", "REJECTED", "WITHDRAWN")
JOB_STATUSES = ("SCHEDULED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED")


class Provider(TimestampMixin, Base):
    __tablename__ = "providers"
    __table_args__ = (Index("ix_providers_type_state", "provider_type", "state"),)

    id: Mapped[str] = id_column("prv")
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, unique=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    provider_type: Mapped[str] = mapped_column(String(48), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(24))
    website: Mapped[str | None] = mapped_column(String(255))

    state: Mapped[str | None] = mapped_column(String(80))
    district: Mapped[str | None] = mapped_column(String(120))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    service_states: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    service_radius_km: Mapped[float | None] = mapped_column(Float)

    certifications: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # Verification is a human decision (AI_AGENT_PLAYBOOK section 17), so it is
    # stored with who decided and when, not as a bare boolean.
    verification_status: Mapped[str] = mapped_column(String(24), nullable=False, default="unverified")
    verified_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    verified_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    rating: Mapped[float | None] = mapped_column(Float)
    rating_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    typical_lead_time_days: Mapped[int | None] = mapped_column(Integer)
    accepting_work: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_demo_seed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    archived_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    services: Mapped[list["ProviderService"]] = relationship(
        back_populates="provider", cascade="all, delete-orphan"
    )


class ProviderService(TimestampMixin, Base):
    """One capability a provider offers, keyed to the intervention it serves."""

    __tablename__ = "provider_services"

    id: Mapped[str] = id_column("psv")
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(48), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # Intervention ids from the engine library this service can implement.
    intervention_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    indicative_price_inr: Mapped[float | None] = mapped_column(Float)
    price_basis: Mapped[str | None] = mapped_column(String(64))
    warranty_months: Mapped[int | None] = mapped_column(Integer)
    lead_time_days: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    provider: Mapped[Provider] = relationship(back_populates="services")


class MaterialListing(TimestampMixin, Base):
    """Raw-material marketplace listing. PRD FR-39.

    `embodied_factor_key` points at the emission-factor registry rather than
    storing a number, and `embodied_source` records where the seller's claim
    came from. A listing with a carbon claim and no source is a marketing
    statement, not data, and the UI must be able to say so.
    """

    __tablename__ = "material_listings"

    id: Mapped[str] = id_column("mtl")
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), nullable=False, index=True)
    material_key: Mapped[str | None] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    grade: Mapped[str | None] = mapped_column(String(120))
    recycled_content_pct: Mapped[float | None] = mapped_column(Float)

    embodied_factor_key: Mapped[str | None] = mapped_column(String(64))
    embodied_tco2e_per_t: Mapped[float | None] = mapped_column(Float)
    embodied_source: Mapped[str | None] = mapped_column(String(255))

    price_inr_per_t: Mapped[float | None] = mapped_column(Float)
    moq_t: Mapped[float | None] = mapped_column(Float)
    stock_t: Mapped[float | None] = mapped_column(Float)
    certifications: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    state: Mapped[str | None] = mapped_column(String(80))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_demo_seed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class RFQ(TimestampMixin, Base):
    __tablename__ = "rfqs"
    __table_args__ = (Index("ix_rfq_factory_status", "factory_id", "status"),)

    id: Mapped[str] = id_column("rfq")
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)
    action_id: Mapped[str | None] = mapped_column(ForeignKey("actions.id"))
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

    intervention_id: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    scope_of_work: Mapped[str | None] = mapped_column(Text)

    # Copied, not referenced. See module docstring.
    shared_context: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    status: Mapped[str] = mapped_column(String(24), nullable=False, default="DRAFT")
    needed_by: Mapped[dt.date | None] = mapped_column(Date)
    closes_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_quote_id: Mapped[str | None] = mapped_column(String(32))

    quotes: Mapped[list["Quote"]] = relationship(
        back_populates="rfq", cascade="all, delete-orphan"
    )
    invites: Mapped[list["RFQInvite"]] = relationship(
        back_populates="rfq", cascade="all, delete-orphan"
    )


class RFQInvite(Base):
    """Which providers an RFQ was sent to.

    A provider sees an RFQ only through one of these rows. Without it the RFQ
    does not exist as far as that provider is concerned.
    """

    __tablename__ = "rfq_invites"
    __table_args__ = (Index("ix_rfq_invite_provider", "provider_id", "rfq_id"),)

    id: Mapped[str] = id_column("rfi")
    rfq_id: Mapped[str] = mapped_column(ForeignKey("rfqs.id"), nullable=False, index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), nullable=False, index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    viewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    declined_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    rfq: Mapped[RFQ] = relationship(back_populates="invites")


class Quote(TimestampMixin, Base):
    __tablename__ = "quotes"
    __table_args__ = (Index("ix_quotes_rfq_status", "rfq_id", "status"),)

    id: Mapped[str] = id_column("qte")
    rfq_id: Mapped[str] = mapped_column(ForeignKey("rfqs.id"), nullable=False, index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), nullable=False, index=True)
    submitted_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

    price_inr: Mapped[float] = mapped_column(Float, nullable=False)
    installation_included: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    installation_inr: Mapped[float | None] = mapped_column(Float)
    annual_opex_delta_inr: Mapped[float | None] = mapped_column(Float)
    warranty_months: Mapped[int | None] = mapped_column(Integer)
    delivery_days: Mapped[int | None] = mapped_column(Integer)
    validity_days: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)

    # Payback recomputed by the engine economics using this quote's real price
    # in place of the library's planning-grade capex estimate. Written by
    # app/services/quote_compare.py, never by the provider.
    revised_payback_yrs: Mapped[float | None] = mapped_column(Float)
    revised_lcoa_inr_per_tco2e: Mapped[float | None] = mapped_column(Float)
    comparison: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    status: Mapped[str] = mapped_column(String(24), nullable=False, default="SUBMITTED")
    is_demo_seed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    rfq: Mapped[RFQ] = relationship(back_populates="quotes")


class ImplementationJob(TimestampMixin, Base):
    """Work in progress after a quote is accepted. PRD FR-37."""

    __tablename__ = "implementation_jobs"

    id: Mapped[str] = id_column("job")
    quote_id: Mapped[str] = mapped_column(ForeignKey("quotes.id"), nullable=False, unique=True)
    rfq_id: Mapped[str] = mapped_column(ForeignKey("rfqs.id"), nullable=False, index=True)
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey("providers.id"), nullable=False, index=True)
    action_id: Mapped[str | None] = mapped_column(ForeignKey("actions.id"))

    status: Mapped[str] = mapped_column(String(24), nullable=False, default="SCHEDULED")
    scheduled_start: Mapped[dt.date | None] = mapped_column(Date)
    scheduled_end: Mapped[dt.date | None] = mapped_column(Date)
    actual_start: Mapped[dt.date | None] = mapped_column(Date)
    actual_end: Mapped[dt.date | None] = mapped_column(Date)
    final_cost_inr: Mapped[float | None] = mapped_column(Float)
    provider_notes: Mapped[str | None] = mapped_column(Text)
    manufacturer_notes: Mapped[str | None] = mapped_column(Text)
