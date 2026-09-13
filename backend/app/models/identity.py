"""
Organizations, users, memberships and per-factory grants.

The isolation model, which FR-01 states as a hard rule:

  * Every business object hangs off an `organization`.
  * A user reaches an organization only through a `membership` row.
  * A consultant or compliance officer who needs one factory inside someone
    else's organization gets a `factory_access` grant for exactly that factory.
  * A provider organization has no path to a manufacturer's assessments at all.
    It sees RFQs that were addressed to it and nothing else.

Authorisation is enforced in `app/services/access.py` against these tables, so a
route that forgets a check cannot construct a query that crosses a tenant.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, LargeBinary, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, id_column

# Organization kinds.
ORG_MANUFACTURER = "manufacturer"
ORG_CONSULTANT = "consultant"
ORG_PROVIDER = "provider"
ORG_PLATFORM = "platform"
ORG_KINDS = (ORG_MANUFACTURER, ORG_CONSULTANT, ORG_PROVIDER, ORG_PLATFORM)

# Roles within an organization. PRD section 4.
ROLE_PLATFORM_ADMIN = "platform_admin"
ROLE_OWNER = "owner"
ROLE_MANAGER = "manager"
ROLE_MEMBER = "member"
ROLE_COMPLIANCE_OFFICER = "compliance_officer"
ROLE_PROVIDER_USER = "provider_user"
ROLE_VIEWER = "viewer"
ROLES = (
    ROLE_PLATFORM_ADMIN, ROLE_OWNER, ROLE_MANAGER, ROLE_MEMBER,
    ROLE_COMPLIANCE_OFFICER, ROLE_PROVIDER_USER, ROLE_VIEWER,
)

# Roles that may change data inside their own organization.
WRITE_ROLES = (ROLE_PLATFORM_ADMIN, ROLE_OWNER, ROLE_MANAGER, ROLE_MEMBER)


class Organization(TimestampMixin, Base):
    __tablename__ = "organizations"

    id: Mapped[str] = id_column("org")
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default=ORG_MANUFACTURER)
    country: Mapped[str | None] = mapped_column(String(2), default="IN")
    state: Mapped[str | None] = mapped_column(String(80))
    cluster: Mapped[str | None] = mapped_column(String(120))
    gstin: Mapped[str | None] = mapped_column(String(20))
    archived_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    memberships: Mapped[list["Membership"]] = relationship(back_populates="organization")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = id_column("usr")
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    phone: Mapped[str | None] = mapped_column(String(24))
    password_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    memberships: Mapped[list["Membership"]] = relationship(back_populates="user")


class Membership(TimestampMixin, Base):
    """A user's seat in one organization. A user may hold several."""

    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", "organization_id", name="uq_membership"),)

    id: Mapped[str] = id_column("mem")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False, default=ROLE_MEMBER)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped[User] = relationship(back_populates="memberships")
    organization: Mapped[Organization] = relationship(back_populates="memberships")


class FactoryAccess(TimestampMixin, Base):
    """An explicit grant of one factory to one user outside its organization.

    This is how a consultant or an assigned compliance officer reads a client's
    factory without being given the whole tenant. `granted_by_user_id` and the
    expiry are what make the grant auditable and revocable, which is the
    difference between delegated access and a shared password.
    """

    __tablename__ = "factory_access"
    __table_args__ = (UniqueConstraint("user_id", "factory_id", name="uq_factory_access"),)

    id: Mapped[str] = id_column("fga")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    factory_id: Mapped[str] = mapped_column(ForeignKey("factories.id"), nullable=False, index=True)
    level: Mapped[str] = mapped_column(String(16), nullable=False, default="read")  # read | write
    granted_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class RefreshToken(Base):
    """Server-side record of an issued refresh token, so it can be revoked.

    Access tokens are stateless and short-lived. Refresh tokens are not: only
    the SHA-256 of the token is stored, so a database dump does not hand an
    attacker a working session, and revoking one row logs out one device.
    """

    __tablename__ = "refresh_tokens"
    __table_args__ = (Index("ix_refresh_user_active", "user_id", "revoked_at"),)

    id: Mapped[str] = id_column("rft")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    device: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
