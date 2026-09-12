"""Shared column conventions for every table."""
from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def as_utc(value: dt.datetime | None) -> dt.datetime | None:
    """Read a stored timestamp back as UTC-aware.

    PostgreSQL returns `timestamptz` values with a tzinfo attached; SQLite has
    no timezone type and returns them naive. Comparing the two raises. Every
    timestamp in this schema is written in UTC, so a naive value read back is
    UTC and is labelled as such here rather than at each call site.
    """
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=dt.timezone.utc)


def new_id(prefix: str) -> str:
    """Prefixed UUID.

    A bare UUID in a log line or an error report tells you nothing about what it
    points at. `fac_9a1c...` does, and it makes an ID pasted into the wrong
    endpoint fail loudly instead of quietly matching nothing.
    """
    return f"{prefix}_{uuid.uuid4().hex[:20]}"


def id_column(prefix: str) -> Mapped[str]:
    return mapped_column(
        String(32), primary_key=True, default=lambda: new_id(prefix)
    )


class TimestampMixin:
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
