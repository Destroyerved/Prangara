"""
Organization membership and delegated factory access. PRD FR-01, section 4.3.

The access *rules* these manage are already enforced everywhere by
`app/services/access.py`. This module only provides the way to create, inspect
and revoke them — which is the difference between delegated access and sharing
a password.

Two rules worth stating:

  * A grant is always to a named user, with a level, an expiry and a record of
    who granted it. There is no "share by link".
  * Only an owner or manager of the factory's own organization can grant access
    to it. A consultant holding a read grant cannot pass it on.
"""
from __future__ import annotations

import datetime as dt
import secrets

from fastapi import APIRouter, status
from sqlalchemy import func, select

from app.api.deps import ClientIp, CurrentPrincipal, DbSession
from app.core.errors import BadRequest, Conflict, Forbidden, NotFound
from app.core.security import hash_password
from app.models.base import utcnow
from app.models.factory import Factory
from app.models.identity import (
    ORG_PROVIDER, ROLE_MANAGER, ROLE_OWNER, ROLE_PLATFORM_ADMIN,
    FactoryAccess, Membership, Organization, User,
)
from app.schemas.auth import (
    FactoryAccessOut, GrantFactoryAccessRequest, InviteMemberRequest, MembershipOut,
    OrganizationOut, UserOut,
)
from app.schemas.common import ApiModel
from app.services import audit
from app.services.access import require_org_write, resolve_factory

router = APIRouter(prefix="/api", tags=["organization"])

# Roles that may bring someone else into an organization or hand out a factory.
_GRANTING_ROLES = (ROLE_PLATFORM_ADMIN, ROLE_OWNER, ROLE_MANAGER)


class InviteResult(ApiModel):
    """What comes back from an invite.

    `temporary_password` is present only when the invite created a brand-new
    account, and it is the one and only time the platform will show it. There is
    no email delivery in this build, so the inviter has to pass it on out of
    band; pretending otherwise would leave people with accounts they cannot
    reach.
    """

    user: UserOut
    membership: MembershipOut
    created_account: bool
    temporary_password: str | None = None
    delivery_note: str


class MemberOut(ApiModel):
    user: UserOut
    role: str
    is_default: bool
    joined_at: dt.datetime


def _require_granting_role(principal: CurrentPrincipal, org_id: str) -> None:
    if principal.is_platform_admin:
        return
    if principal.role_in(org_id) not in _GRANTING_ROLES:
        raise Forbidden(
            "Only an owner or manager can add people or grant factory access."
        )


@router.get("/organizations/{organization_id}/members", response_model=list[MemberOut])
def list_members(organization_id: str, principal: CurrentPrincipal,
                 db: DbSession) -> list[MemberOut]:
    if not principal.is_platform_admin and organization_id not in principal.org_ids:
        raise NotFound("Organization not found.")

    rows = db.scalars(
        select(Membership).where(Membership.organization_id == organization_id)
    ).all()
    users = {
        u.id: u for u in db.scalars(
            select(User).where(User.id.in_([m.user_id for m in rows] or [""]))
        ).all()
    }
    return [
        MemberOut(
            user=UserOut.model_validate(users[m.user_id]),
            role=m.role,
            is_default=m.is_default,
            joined_at=m.created_at,
        )
        for m in rows
        if m.user_id in users
    ]


@router.post("/organizations/{organization_id}/members", response_model=InviteResult,
             status_code=status.HTTP_201_CREATED)
def invite_member(organization_id: str, body: InviteMemberRequest,
                  principal: CurrentPrincipal, db: DbSession,
                  ip: ClientIp) -> InviteResult:
    """Add someone to an organization, creating their account if they have none."""
    organization = db.get(Organization, organization_id)
    if organization is None or organization.archived_at is not None:
        raise NotFound("Organization not found.")
    if not principal.is_platform_admin and organization_id not in principal.org_ids:
        raise NotFound("Organization not found.")
    _require_granting_role(principal, organization_id)

    if body.role == ROLE_PLATFORM_ADMIN and not principal.is_platform_admin:
        raise Forbidden("Only a platform administrator can grant platform admin.")

    email = body.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    created_account = False
    temporary_password: str | None = None

    if user is None:
        temporary_password = secrets.token_urlsafe(12)
        user = User(
            email=email,
            full_name=(body.full_name or email.split("@")[0]).strip(),
            password_hash=hash_password(temporary_password),
        )
        db.add(user)
        db.flush()
        created_account = True
    else:
        existing = db.scalar(
            select(Membership).where(
                Membership.user_id == user.id,
                Membership.organization_id == organization_id,
            )
        )
        if existing is not None:
            raise Conflict(
                "That person is already a member of this organization.",
                "already_a_member",
                {"role": existing.role},
            )

    has_default = db.scalar(
        select(func.count()).select_from(Membership).where(Membership.user_id == user.id)
    ) or 0
    membership = Membership(
        user_id=user.id,
        organization_id=organization_id,
        role=body.role,
        is_default=has_default == 0,
    )
    db.add(membership)
    # Flush before the audit read: the primary key comes from a Python-side
    # default that is only evaluated at flush time.
    db.flush()

    audit.record(
        db, action="organization.member.invite", object_type="membership",
        object_id=membership.id, organization_id=organization_id,
        actor_user_id=principal.user_id, actor_label=principal.user.email,
        ip_address=ip,
        new_value={"email": email, "role": body.role,
                   "created_account": created_account},
    )
    db.commit()

    return InviteResult(
        user=UserOut.model_validate(user),
        membership=MembershipOut(
            organization=OrganizationOut.model_validate(organization),
            role=membership.role,
            is_default=membership.is_default,
        ),
        created_account=created_account,
        temporary_password=temporary_password,
        delivery_note=(
            "This build sends no email. Pass the temporary password on securely "
            "and ask them to change it after signing in."
            if created_account else
            "This person already had an account; they can sign in with their "
            "existing password and switch to this organization."
        ),
    )


@router.delete("/organizations/{organization_id}/members/{user_id}")
def remove_member(organization_id: str, user_id: str, principal: CurrentPrincipal,
                  db: DbSession, ip: ClientIp) -> dict[str, bool]:
    if not principal.is_platform_admin and organization_id not in principal.org_ids:
        raise NotFound("Organization not found.")
    _require_granting_role(principal, organization_id)

    membership = db.scalar(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.organization_id == organization_id,
        )
    )
    if membership is None:
        raise NotFound("That person is not a member of this organization.")

    if membership.role == ROLE_OWNER:
        owners = db.scalar(
            select(func.count()).select_from(Membership).where(
                Membership.organization_id == organization_id,
                Membership.role == ROLE_OWNER,
            )
        ) or 0
        if owners <= 1:
            # An organization with no owner cannot grant access to itself again,
            # so this would orphan every factory under it.
            raise BadRequest(
                "This is the only owner of the organization. Make someone else an "
                "owner before removing them.",
                "last_owner",
            )

    audit.record(
        db, action="organization.member.remove", object_type="membership",
        object_id=membership.id, organization_id=organization_id,
        actor_user_id=principal.user_id, actor_label=principal.user.email,
        ip_address=ip, old_value={"user_id": user_id, "role": membership.role},
    )
    db.delete(membership)
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# delegated factory access
# --------------------------------------------------------------------------

@router.get("/factories/{factory_id}/access", response_model=list[FactoryAccessOut])
def list_grants(factory_id: str, principal: CurrentPrincipal,
                db: DbSession) -> list[FactoryAccessOut]:
    factory = resolve_factory(db, principal, factory_id)
    rows = db.scalars(
        select(FactoryAccess)
        .where(FactoryAccess.factory_id == factory.id)
        .order_by(FactoryAccess.created_at.desc())
    ).all()
    return [FactoryAccessOut.model_validate(r) for r in rows]


@router.post("/factories/{factory_id}/access", response_model=FactoryAccessOut,
             status_code=status.HTTP_201_CREATED)
def grant_access(factory_id: str, body: GrantFactoryAccessRequest,
                 principal: CurrentPrincipal, db: DbSession,
                 ip: ClientIp) -> FactoryAccessOut:
    """Give one named person access to one factory.

    This is how a consultant or an assigned compliance officer reads a client's
    factory without a seat in the client's organization.
    """
    factory = resolve_factory(db, principal, factory_id, write=True)
    # Only the factory's own organization may hand it out. A consultant holding
    # a grant must not be able to pass it on.
    require_org_write(principal, factory.organization_id)
    _require_granting_role(principal, factory.organization_id)

    email = body.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None:
        raise NotFound(
            "No account with that email. Invite them to an organization first, "
            "so the grant is made to a real person."
        )

    if any(
        db.scalar(select(Organization).where(Organization.id == m.organization_id)).kind
        == ORG_PROVIDER
        for m in db.scalars(select(Membership).where(Membership.user_id == user.id)).all()
    ):
        # FR-01's hard rule. A provider must never hold a factory grant, or the
        # marketplace boundary becomes a suggestion.
        raise BadRequest(
            "Service providers cannot be granted access to factory data. They see "
            "only the RFQs addressed to them.",
            "provider_cannot_hold_grant",
        )

    if user.id in {m.user_id for m in db.scalars(
        select(Membership).where(Membership.organization_id == factory.organization_id)
    ).all()}:
        raise Conflict(
            "That person is already a member of this organization and can "
            "already see this factory.",
            "already_a_member",
        )

    existing = db.scalar(
        select(FactoryAccess).where(
            FactoryAccess.user_id == user.id,
            FactoryAccess.factory_id == factory.id,
        )
    )
    if existing is not None and existing.revoked_at is None:
        raise Conflict("That person already has access to this factory.",
                       "grant_exists", {"level": existing.level})

    grant = FactoryAccess(
        user_id=user.id,
        factory_id=factory.id,
        level=body.level,
        granted_by_user_id=principal.user_id,
        expires_at=body.expires_at,
    )
    db.add(grant)
    db.flush()

    audit.record(
        db, action="factory.access.grant", object_type="factory_access",
        object_id=grant.id, organization_id=factory.organization_id,
        actor_user_id=principal.user_id, actor_label=principal.user.email,
        ip_address=ip,
        new_value={"factory_id": factory.id, "user_email": email,
                   "level": body.level,
                   "expires_at": body.expires_at.isoformat() if body.expires_at else None},
    )
    db.commit()
    return FactoryAccessOut.model_validate(grant)


@router.delete("/factories/{factory_id}/access/{grant_id}")
def revoke_access(factory_id: str, grant_id: str, principal: CurrentPrincipal,
                  db: DbSession, ip: ClientIp,
                  reason: str | None = None) -> dict[str, bool]:
    """Revoke a grant.

    Revoked rather than deleted: who had access to a factory's carbon data, and
    when, is part of the audit trail.
    """
    factory = resolve_factory(db, principal, factory_id, write=True)
    require_org_write(principal, factory.organization_id)
    _require_granting_role(principal, factory.organization_id)

    grant = db.get(FactoryAccess, grant_id)
    if grant is None or grant.factory_id != factory.id:
        raise NotFound("Grant not found.")
    if grant.revoked_at is None:
        grant.revoked_at = utcnow()

    audit.record(
        db, action="factory.access.revoke", object_type="factory_access",
        object_id=grant.id, organization_id=factory.organization_id,
        actor_user_id=principal.user_id, actor_label=principal.user.email,
        reason=reason, ip_address=ip,
        old_value={"user_id": grant.user_id, "level": grant.level},
    )
    db.commit()
    return {"ok": True}
