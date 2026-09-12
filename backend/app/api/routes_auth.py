"""
Auth and identity endpoints. PRD FR-01, API group `Auth`.

Register creates a user, an organization and an owner membership in one
transaction. There is no path that leaves a user without an organization,
because every business object in this schema hangs off one.
"""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, status
from sqlalchemy import func, select

from app.api.deps import ClientIp, CurrentPrincipal, DbSession
from app.core.errors import Conflict, NotFound, Unauthorized
from app.core.security import (
    create_access_token, create_refresh_token, hash_password, hash_refresh_token,
    verify_password,
)
from app.models.base import as_utc, utcnow
from app.models.identity import (
    ORG_MANUFACTURER, ROLE_OWNER, Membership, Organization, RefreshToken, User,
)
from app.schemas.auth import (
    LoginRequest, MeResponse, MembershipOut, OrganizationOut, RefreshRequest,
    RegisterRequest, TokenResponse, UserOut,
)
from app.services import audit
from app.services.access import load_principal

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _issue(db: DbSession, user: User, device: str | None) -> TokenResponse:
    raw, token_hash, expires = create_refresh_token()
    session_row = RefreshToken(
        user_id=user.id, token_hash=token_hash, device=device,
        created_at=utcnow(), expires_at=expires,
    )
    db.add(session_row)
    db.flush()
    access, ttl = create_access_token(user.id, session_row.id)
    return TokenResponse(access_token=access, refresh_token=raw, expires_in=ttl)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: DbSession, ip: ClientIp) -> TokenResponse:
    email = body.email.strip().lower()
    existing = db.scalar(select(User).where(func.lower(User.email) == email))
    if existing is not None:
        raise Conflict("An account with that email already exists.", "email_taken")

    org = Organization(
        name=(body.organization_name or body.full_name or email.split("@")[0]).strip(),
        kind=body.organization_kind or ORG_MANUFACTURER,
    )
    user = User(
        email=email,
        full_name=(body.full_name or email.split("@")[0]).strip(),
        phone=body.phone,
        password_hash=hash_password(body.password),
    )
    db.add_all([org, user])
    db.flush()
    db.add(Membership(user_id=user.id, organization_id=org.id, role=ROLE_OWNER, is_default=True))

    tokens = _issue(db, user, device=None)
    audit.record(
        db, action="user.register", object_type="user", object_id=user.id,
        organization_id=org.id, actor_user_id=user.id, actor_label=user.email,
        new_value={"email": user.email, "organization": org.name, "kind": org.kind},
        ip_address=ip,
    )
    db.commit()
    return tokens


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DbSession, ip: ClientIp) -> TokenResponse:
    email = body.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    # Identical response whether the account is missing or the password is
    # wrong, so this endpoint cannot be used to enumerate registered addresses.
    if user is None or not verify_password(body.password, user.password_hash):
        raise Unauthorized("Email or password is incorrect.", "invalid_credentials")
    if not user.is_active:
        raise Unauthorized("This account has been deactivated.", "account_inactive")

    user.last_login_at = utcnow()
    tokens = _issue(db, user, body.device)
    audit.record(
        db, action="user.login", object_type="user", object_id=user.id,
        actor_user_id=user.id, actor_label=user.email, ip_address=ip,
        new_value={"device": body.device},
    )
    db.commit()
    return tokens


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: DbSession) -> TokenResponse:
    row = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(body.refresh_token))
    )
    if row is None or row.revoked_at is not None:
        raise Unauthorized("Session is not valid. Sign in again.", "refresh_invalid")
    if as_utc(row.expires_at) < dt.datetime.now(dt.timezone.utc):
        raise Unauthorized("Session has expired. Sign in again.", "refresh_expired")

    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        raise Unauthorized("Account is not active.", "account_inactive")

    # Rotate. The presented refresh token is burned even though it was valid, so
    # a stolen token is usable at most once and the theft shows up as the real
    # device being logged out.
    row.revoked_at = utcnow()
    tokens = _issue(db, user, row.device)
    db.commit()
    return tokens


@router.post("/logout")
def logout(body: RefreshRequest, db: DbSession) -> dict[str, bool]:
    row = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(body.refresh_token))
    )
    if row is not None and row.revoked_at is None:
        row.revoked_at = utcnow()
        db.commit()
    # Always ok: logging out something already gone is not an error.
    return {"ok": True}


@router.post("/logout-all")
def logout_all(principal: CurrentPrincipal, db: DbSession) -> dict[str, int]:
    rows = db.scalars(
        select(RefreshToken).where(
            RefreshToken.user_id == principal.user_id, RefreshToken.revoked_at.is_(None)
        )
    ).all()
    now = utcnow()
    for row in rows:
        row.revoked_at = now
    audit.record(
        db, action="user.logout_all", object_type="user", object_id=principal.user_id,
        actor_user_id=principal.user_id, new_value={"sessions_revoked": len(rows)},
    )
    db.commit()
    return {"sessions_revoked": len(rows)}


def _permissions(principal) -> list[str]:
    """Coarse capability list the clients use to hide what a role cannot do.

    This is a UI convenience, not the enforcement point. Enforcement lives in
    `app/services/access.py` and runs on every request regardless of this list.
    """
    perms: set[str] = {"factory:read"}
    if principal.is_platform_admin:
        return sorted({
            "platform:admin", "factory:read", "factory:write", "assessment:run",
            "evidence:write", "marketplace:read", "marketplace:write",
            "compliance:read", "compliance:write", "provider:manage",
        })
    for membership in principal.memberships:
        org = principal.organizations.get(membership.organization_id)
        kind = org.kind if org else ""
        if kind == "provider":
            perms.update({"provider:manage", "marketplace:read", "rfq:quote"})
            perms.discard("factory:read")
            continue
        if membership.role in ("owner", "manager", "member"):
            perms.update({
                "factory:write", "assessment:run", "evidence:write",
                "marketplace:read", "marketplace:write",
            })
        if membership.role == "compliance_officer":
            perms.update({"compliance:read", "compliance:write", "evidence:write"})
    return sorted(perms)


@router.get("/me", response_model=MeResponse)
def me(principal: CurrentPrincipal) -> MeResponse:
    return MeResponse(
        user=UserOut.model_validate(principal.user),
        memberships=[
            MembershipOut(
                organization=OrganizationOut.model_validate(
                    principal.organizations[m.organization_id]
                ),
                role=m.role,
                is_default=m.is_default,
            )
            for m in principal.memberships
            if m.organization_id in principal.organizations
        ],
        active_organization_id=principal.active_org_id,
        is_platform_admin=principal.is_platform_admin,
        permissions=_permissions(principal),
    )


@router.post("/switch-organization/{organization_id}", response_model=MeResponse)
def switch_organization(organization_id: str, principal: CurrentPrincipal,
                        db: DbSession) -> MeResponse:
    """Confirm a membership so the client knows which `X-Organization-Id` to send."""
    if organization_id not in principal.org_ids:
        raise NotFound("Organization not found.")
    reloaded = load_principal(db, principal.user, organization_id)
    return me(reloaded)
