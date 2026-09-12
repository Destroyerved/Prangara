"""
Assessment snapshots and what-if scenarios.

An assessment stores three things: the exact profile that went into the engine,
the exact result that came out, and the version stamp of every input dataset.
That triple is what makes PRD section 30 auditability real - the same profile
replayed against the same versions must reproduce the same answer, and a factor
correction must never silently rewrite a past result.

`result_json` is the full engine payload. The scalar columns beside it are
denormalised copies used for portfolio rollups and peer-cohort statistics, so a
benchmark query never has to parse a blob.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, id_column


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (Index("ix_assessments_factory_time", "factory_id", "created_at"),)

    id: Mapped[str] = id_column("asm")
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    profile_id: Mapped[str | None] = mapped_column(ForeignKey("factory_profiles.id"))
    # assessments <-> scenarios is a genuine cycle: a scenario points at the
    # baseline it varies, and a scenario run produces an assessment. use_alter
    # tells the DDL layer to add this constraint after both tables exist.
    scenario_id: Mapped[str | None] = mapped_column(
        ForeignKey("scenarios.id", use_alter=True, name="fk_assessments_scenario")
    )
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    label: Mapped[str | None] = mapped_column(String(160))
    is_baseline: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    engine_profile: Mapped[dict] = mapped_column(JSON, nullable=False)
    result: Mapped[dict] = mapped_column(JSON, nullable=False)
    version_stamp: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Denormalised headline figures.
    total_tco2e: Mapped[float | None] = mapped_column(Float)
    total_low_tco2e: Mapped[float | None] = mapped_column(Float)
    total_high_tco2e: Mapped[float | None] = mapped_column(Float)
    scope1_tco2e: Mapped[float | None] = mapped_column(Float)
    scope2_tco2e: Mapped[float | None] = mapped_column(Float)
    scope3_tco2e: Mapped[float | None] = mapped_column(Float)
    scope12_per_t: Mapped[float | None] = mapped_column(Float)
    electricity_kwh_per_t: Mapped[float | None] = mapped_column(Float)
    thermal_gj_per_t: Mapped[float | None] = mapped_column(Float)

    leak_count: Mapped[int | None] = mapped_column(Integer)
    critical_leak_count: Mapped[int | None] = mapped_column(Integer)
    cash_positive_abatement_tco2e: Mapped[float | None] = mapped_column(Float)
    cash_positive_benefit_inr: Mapped[float | None] = mapped_column(Float)
    cash_positive_capex_inr: Mapped[float | None] = mapped_column(Float)
    data_quality_score: Mapped[float | None] = mapped_column(Float)


class Scenario(TimestampMixin, Base):
    """A what-if variation on a baseline profile. PRD FR-34.

    A scenario never overwrites the baseline. It stores the modifications, and
    running it produces a normal assessment row flagged `is_baseline = False`,
    so a scenario result is directly comparable with the baseline it came from.
    """

    __tablename__ = "scenarios"

    id: Mapped[str] = id_column("scn")
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    baseline_assessment_id: Mapped[str | None] = mapped_column(
        ForeignKey("assessments.id", use_alter=True, name="fk_scenarios_baseline")
    )
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # Declarative modifications applied by app/services/scenario.py. Kept as
    # data rather than a computed profile so the same scenario can be replayed
    # against a newer baseline.
    modifications: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    latest_assessment_id: Mapped[str | None] = mapped_column(String(32))
    archived_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
