"""
Factories, sites, profiles, activity streams and assets.

Shape worth noting: a `Factory` is the commercial entity, a `FactorySite` is a
physical location, and a `FactoryProfile` is one reporting period's snapshot of
that site. Activity records hang off the profile, not off the factory, because
"180,000 kWh" is meaningless without the period it was measured over. Rerunning
last year's assessment must not pick up this year's bills.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, id_column

# Activity stream kinds. These map onto the engine PlantProfile keys.
STREAM_ELECTRICITY = "electricity"
STREAM_FUEL = "fuel"
STREAM_MATERIAL = "material"
STREAM_WASTE = "waste"
STREAM_FREIGHT = "freight"
STREAM_KINDS = (STREAM_ELECTRICITY, STREAM_FUEL, STREAM_MATERIAL, STREAM_WASTE, STREAM_FREIGHT)

# Field-level data states. PRD FR-08.
STATE_VERIFIED = "VERIFIED"
STATE_DOCUMENT_CONFIRMED = "DOCUMENT-CONFIRMED"
STATE_DECLARED = "DECLARED"
STATE_ESTIMATED = "ESTIMATED"
STATE_MISSING = "MISSING"
STATE_STALE = "STALE"
DATA_STATES = (
    STATE_VERIFIED, STATE_DOCUMENT_CONFIRMED, STATE_DECLARED,
    STATE_ESTIMATED, STATE_MISSING, STATE_STALE,
)


class Factory(TimestampMixin, Base):
    __tablename__ = "factories"
    __table_args__ = (Index("ix_factories_org_active", "organization_id", "archived_at"),)

    id: Mapped[str] = id_column("fac")
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sector: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    subsector: Mapped[str | None] = mapped_column(String(64))
    state: Mapped[str | None] = mapped_column(String(80))
    district: Mapped[str | None] = mapped_column(String(120))
    cluster: Mapped[str | None] = mapped_column(String(120))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    # A factory may have been introduced by a large customer running a supplier
    # programme (PRD FR-56). The customer owns the relationship; the factory
    # still owns its data, so this is a reference, not a second owner.
    referred_by_org_id: Mapped[str | None] = mapped_column(ForeignKey("organizations.id"))
    archived_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    sites: Mapped[list["FactorySite"]] = relationship(
        back_populates="factory", cascade="all, delete-orphan"
    )
    profiles: Mapped[list["FactoryProfile"]] = relationship(
        back_populates="factory", cascade="all, delete-orphan"
    )


class FactorySite(TimestampMixin, Base):
    __tablename__ = "factory_sites"

    id: Mapped[str] = id_column("sit")
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(String(80))
    district: Mapped[str | None] = mapped_column(String(120))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    archived_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    factory: Mapped[Factory] = relationship(back_populates="sites")


class FactoryProfile(TimestampMixin, Base):
    """One reporting period of scale, energy price and economics for a factory."""

    __tablename__ = "factory_profiles"
    __table_args__ = (Index("ix_profiles_factory_period", "factory_id", "period_start"),)

    id: Mapped[str] = id_column("prf")
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)
    site_id: Mapped[str | None] = mapped_column(ForeignKey("factory_sites.id"))
    label: Mapped[str] = mapped_column(String(120), nullable=False, default="Current period")

    period_start: Mapped[dt.date | None] = mapped_column(Date)
    period_end: Mapped[dt.date | None] = mapped_column(Date)

    annual_output_t: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    output_unit: Mapped[str] = mapped_column(String(32), nullable=False, default="tonne")
    annual_revenue_cr: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    employees: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    operating_days: Mapped[int | None] = mapped_column(Integer)
    shifts_per_day: Mapped[int | None] = mapped_column(Integer)

    export_share_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    eu_export_share_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    tariff_inr_per_kwh: Mapped[float | None] = mapped_column(Float)
    discount_rate: Mapped[float | None] = mapped_column(Float)

    # Per-field data state, keyed by field name. Written by the intake and data
    # quality layers; read by the UI to draw evidence badges.
    field_states: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    is_draft: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text)

    factory: Mapped[Factory] = relationship(back_populates="profiles")
    activity_records: Mapped[list["ActivityRecord"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )


class ActivityRecord(TimestampMixin, Base):
    """One measured or declared activity quantity for a reporting period.

    `factor_key` is the key in the emission-factor registry this quantity is
    priced against (for example COAL_INDIAN, IN_GRID_NATIONAL). Keeping the key
    here rather than a computed emission value is deliberate: emissions are
    recomputed by the engine at assessment time, so a factor correction fixes
    every future assessment without rewriting stored activity data.
    """

    __tablename__ = "activity_records"
    __table_args__ = (Index("ix_activity_profile_stream", "profile_id", "stream_kind"),)

    id: Mapped[str] = id_column("act")
    profile_id: Mapped[str] = mapped_column(
        ForeignKey("factory_profiles.id"), nullable=False, index=True
    )
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)

    stream_kind: Mapped[str] = mapped_column(String(24), nullable=False)
    factor_key: Mapped[str | None] = mapped_column(String(64))
    label: Mapped[str | None] = mapped_column(String(200))

    quantity: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    unit: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    period_start: Mapped[dt.date | None] = mapped_column(Date)
    period_end: Mapped[dt.date | None] = mapped_column(Date)

    data_state: Mapped[str] = mapped_column(String(24), nullable=False, default=STATE_DECLARED)
    # How this record arrived: manual | conversation | document_ocr | equipment_scan | import
    source_kind: Mapped[str] = mapped_column(String(24), nullable=False, default="manual")
    extraction_confidence: Mapped[float | None] = mapped_column(Float)
    confirmed_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    confirmed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    unit_cost_inr: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)

    profile: Mapped[FactoryProfile] = relationship(back_populates="activity_records")


class Asset(TimestampMixin, Base):
    """Registered plant equipment. PRD FR-07."""

    __tablename__ = "assets"

    id: Mapped[str] = id_column("ast")
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)
    site_id: Mapped[str | None] = mapped_column(ForeignKey("factory_sites.id"))

    asset_type: Mapped[str] = mapped_column(String(48), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(String(120))
    model: Mapped[str | None] = mapped_column(String(120))
    serial_number: Mapped[str | None] = mapped_column(String(120))

    rated_power_kw: Mapped[float | None] = mapped_column(Float)
    rated_capacity: Mapped[float | None] = mapped_column(Float)
    capacity_unit: Mapped[str | None] = mapped_column(String(32))
    efficiency_pct: Mapped[float | None] = mapped_column(Float)
    year_installed: Mapped[int | None] = mapped_column(Integer)
    energy_type: Mapped[str | None] = mapped_column(String(32))
    fuel_factor_key: Mapped[str | None] = mapped_column(String(64))

    operating_hours_per_year: Mapped[float | None] = mapped_column(Float)
    load_factor: Mapped[float | None] = mapped_column(Float)
    maintenance_status: Mapped[str | None] = mapped_column(String(32))

    # Deterministic estimate produced by app/services/asset_energy.py. Never an
    # LLM output: a nameplate photo gives rated power, not annual consumption.
    estimated_annual_kwh: Mapped[float | None] = mapped_column(Float)
    estimated_annual_tco2e: Mapped[float | None] = mapped_column(Float)
    estimate_basis: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[str] = mapped_column(String(16), nullable=False, default="low")
    data_state: Mapped[str] = mapped_column(String(24), nullable=False, default=STATE_DECLARED)

    archived_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
