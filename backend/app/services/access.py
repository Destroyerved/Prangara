"""
Authorisation, enforced at the data boundary.

Every read or write of factory-scoped data goes through one of the resolvers
here. They do not take an organization id from the caller - they derive it from
the authenticated principal and the object being reached. A route that forgets
to check cannot construct a query that crosses a tenant, because it has no way
to obtain a Factory except through `resolve_factory`.

Three access paths exist, in this order:

  1. Platform admin - sees everything, and every such read is audited.
  2. Organization membership - the factory belongs to an org the user is in.
  3. Explicit factory grant - a consultant or compliance officer was given this
     one factory by its owner, with a level and an expiry.

Provider organizations have no path at all. They reach RFQs addressed to them
and nothing else; `require_provider` is the only door they have.
"""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import Forbidden, NotFound
from app.models.base import as_utc
from app.models.factory import Factory
from app.models.identity import (
    ORG_PROVIDER, ROLE_PLATFORM_ADMIN, WRITE_ROLES, FactoryAccess, Membership,
    Organization, User,
)
from app.models.marketplace import Provider


@dataclass
class Principal:
    """The authenticated caller, with everything authorisation needs preloaded."""

    user: User
    memberships: list[Membership] = field(default_factory=list)
    organizations: dict[str, Organization] = field(default_factory=dict)
    active_org_id: str | None = None

    @property
    def user_id(self) -> str:
        return self.user.id

    @property
    def org_ids(self) -> set[str]:
        return {m.organization_id for m in self.memberships}

    @property
    def is_platform_admin(self) -> bool:
        return any(m.role == ROLE_PLATFORM_ADMIN for m in self.memberships)

    def role_in(self, org_id: str) -> str | None:
        for m in self.memberships:
            if m.organization_id == org_id:
                return m.role
        return None

    def can_write_org(self, org_id: str) -> bool:
        if self.is_platform_admin:
            return True
        return self.role_in(org_id) in WRITE_ROLES

    @property
    def active_org(self) -> Organization | None:
        return self.organizations.get(self.active_org_id or "")

    @property
    def is_provider(self) -> bool:
        return any(o.kind == ORG_PROVIDER for o in self.organizations.values())


def load_principal(db: Session, user: User, active_org_id: str | None = None) -> Principal:
    memberships = list(
        db.scalars(select(Membership).where(Membership.user_id == user.id)).all()
    )
    orgs: dict[str, Organization] = {}
    if memberships:
        rows = db.scalars(
            select(Organization).where(
                Organization.id.in_([m.organization_id for m in memberships])
            )
        ).all()
        orgs = {o.id: o for o in rows}

    chosen = active_org_id
    if chosen and chosen not in {m.organization_id for m in memberships}:
        chosen = None
    if not chosen:
        default = next((m for m in memberships if m.is_default), None)
        chosen = (default or memberships[0]).organization_id if memberships else None

    return Principal(
        user=user, memberships=memberships, organizations=orgs, active_org_id=chosen
    )


def _grant_for(db: Session, user_id: str, factory_id: str) -> FactoryAccess | None:
    grant = db.scalar(
        select(FactoryAccess).where(
            FactoryAccess.user_id == user_id,
            FactoryAccess.factory_id == factory_id,
            FactoryAccess.revoked_at.is_(None),
        )
    )
    if grant is None:
        return None
    if grant.expires_at is not None and as_utc(grant.expires_at) < dt.datetime.now(dt.timezone.utc):
        return None
    return grant


def resolve_factory(db: Session, principal: Principal, factory_id: str,
                    write: bool = False) -> Factory:
    """Load a factory the principal may reach, or raise 404.

    Cross-tenant reads return 404 rather than 403 on purpose - see
    `app.core.errors.NotFound`.
    """
    factory = db.get(Factory, factory_id)
    if factory is None or factory.archived_at is not None:
        raise NotFound("Factory not found.")

    if principal.is_platform_admin:
        return factory

    role = principal.role_in(factory.organization_id)
    if role is not None:
        if write and not principal.can_write_org(factory.organization_id):
            raise Forbidden("Your role on this organization is read-only.")
        return factory

    grant = _grant_for(db, principal.user_id, factory_id)
    if grant is not None:
        if write and grant.level != "write":
            raise Forbidden("Your access to this factory is read-only.")
        return factory

    raise NotFound("Factory not found.")


def accessible_factory_ids(db: Session, principal: Principal) -> list[str] | None:
    """Every factory id the principal may read. None means 'no restriction'."""
    if principal.is_platform_admin:
        return None

    ids: set[str] = set()
    if principal.org_ids:
        ids.update(
            db.scalars(
                select(Factory.id).where(
                    Factory.organization_id.in_(principal.org_ids),
                    Factory.archived_at.is_(None),
                )
            ).all()
        )
    now = dt.datetime.now(dt.timezone.utc)
    grants = db.scalars(
        select(FactoryAccess).where(
            FactoryAccess.user_id == principal.user_id,
            FactoryAccess.revoked_at.is_(None),
        )
    ).all()
    ids.update(g.factory_id for g in grants
               if g.expires_at is None or as_utc(g.expires_at) > now)
    return sorted(ids)


def require_org_write(principal: Principal, org_id: str) -> None:
    if not principal.can_write_org(org_id):
        raise Forbidden("You do not have permission to change this organization's data.")


def require_role(principal: Principal, org_id: str, roles: Iterable[str]) -> None:
    if principal.is_platform_admin:
        return
    if principal.role_in(org_id) not in set(roles):
        raise Forbidden("Your role does not permit this action.")


def require_platform_admin(principal: Principal) -> None:
    if not principal.is_platform_admin:
        raise Forbidden("Platform administrator access is required.")


def require_provider(db: Session, principal: Principal) -> Provider:
    """The provider profile this principal acts for, or 403.

    This is the only entry point a provider organization has into marketplace
    data, and it deliberately returns the Provider row rather than an org id, so
    every downstream query is filtered by a concrete provider.
    """
    for org_id, org in principal.organizations.items():
        if org.kind != ORG_PROVIDER:
            continue
        provider = db.scalar(select(Provider).where(Provider.organization_id == org_id))
        if provider is not None and provider.archived_at is None:
            return provider
    raise Forbidden("This endpoint is for registered service providers.")
