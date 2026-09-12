"""
Carbon action tracking and measurement & verification. PRD FR-51 and FR-52.

This is the table that turns advice into a record. Each row starts life as a
recommendation from an assessment, carries the engine's *expected* numbers, and
ends with what actually happened. The gap between `expected_` and `actual_` is
the only honest measure of whether the tool works, and per PRD FR-52 it is also
the dataset that makes later ML meaningful.

Nothing here recomputes carbon. Expected values are copied from the engine
result; actual values are entered by the factory and backed by evidence.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Index, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, id_column

ACTION_STATUSES = (
    "PROPOSED", "SELECTED", "RFQ", "APPROVED", "IMPLEMENTING",
    "COMPLETED", "VERIFYING", "VERIFIED", "REJECTED",
)

# Statuses in which the action is still live work rather than finished or dropped.
ACTIVE_STATUSES = ("SELECTED", "RFQ", "APPROVED", "IMPLEMENTING", "COMPLETED", "VERIFYING")


class Action(TimestampMixin, Base):
    __tablename__ = "actions"
    __table_args__ = (
        UniqueConstraint("factory_id", "intervention_id", name="uq_action_factory_intervention"),
        Index("ix_actions_factory_status", "factory_id", "status"),
    )

    id: Mapped[str] = id_column("acn")
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    origin_assessment_id: Mapped[str | None] = mapped_column(ForeignKey("assessments.id"))
    owner_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

    intervention_id: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    category: Mapped[str | None] = mapped_column(String(48))
    target_stream: Mapped[str | None] = mapped_column(String(64))

    status: Mapped[str] = mapped_column(String(24), nullable=False, default="PROPOSED")

    # Engine expectations, copied at the time the action was created. They are a
    # snapshot on purpose: a later assessment must not silently restate what the
    # factory was told when it committed capital.
    expected_abatement_tco2e: Mapped[float | None] = mapped_column(Float)
    expected_capex_inr: Mapped[float | None] = mapped_column(Float)
    expected_annual_benefit_inr: Mapped[float | None] = mapped_column(Float)
    expected_payback_yrs: Mapped[float | None] = mapped_column(Float)
    expected_lcoa_inr_per_tco2e: Mapped[float | None] = mapped_column(Float)
    engine_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    actual_abatement_tco2e: Mapped[float | None] = mapped_column(Float)
    actual_capex_inr: Mapped[float | None] = mapped_column(Float)
    actual_annual_benefit_inr: Mapped[float | None] = mapped_column(Float)

    target_date: Mapped[dt.date | None] = mapped_column(Date)
    started_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    rejected_reason: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    # Set when the engine refused or capped this intervention for this plant, so
    # the record keeps the reason even if the user overrides it.
    was_blocked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    was_capped: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    restriction_note: Mapped[str | None] = mapped_column(Text)


class VerificationPeriod(TimestampMixin, Base):
    """A post-implementation measurement window for one action."""

    __tablename__ = "verification_periods"

    id: Mapped[str] = id_column("vpd")
    action_id: Mapped[str] = mapped_column(ForeignKey("actions.id"), nullable=False, index=True)
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)

    baseline_assessment_id: Mapped[str | None] = mapped_column(ForeignKey("assessments.id"))
    actual_assessment_id: Mapped[str | None] = mapped_column(ForeignKey("assessments.id"))

    period_start: Mapped[dt.date] = mapped_column(Date, nullable=False)
    period_end: Mapped[dt.date] = mapped_column(Date, nullable=False)
    # Production/weather normalisation applied when comparing periods. Stored so
    # a reviewer can see what the comparison was adjusted for.
    normalisation: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="OPEN")
    notes: Mapped[str | None] = mapped_column(Text)


class VerificationResult(TimestampMixin, Base):
    """Baseline vs normalised-expected vs actual, per metric. PRD FR-52."""

    __tablename__ = "verification_results"
    __table_args__ = (Index("ix_verification_period_metric", "period_id", "metric"),)

    id: Mapped[str] = id_column("vrs")
    period_id: Mapped[str] = mapped_column(
        ForeignKey("verification_periods.id"), nullable=False, index=True
    )
    metric: Mapped[str] = mapped_column(String(48), nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False, default="")

    baseline_value: Mapped[float | None] = mapped_column(Float)
    expected_value: Mapped[float | None] = mapped_column(Float)
    actual_value: Mapped[float | None] = mapped_column(Float)
    achievement_pct: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    assumptions: Mapped[str | None] = mapped_column(Text)
