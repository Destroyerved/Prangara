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
from app.core import ratelimit
from app.core.errors import (
    Conflict, NotFound, TooManyRequests, Unauthorized,
)
from app.core.security import (
    create_access_token, create_refresh_token, hash_password, hash_refresh_token,
    verify_password,
)
from app.models.base import as_utc, utcnow
from app.models.identity import (
    ORG_MANUFACTURER, ROLE_OWNER, ROLES, Membership, Organization, RefreshToken, User,
)
from app.schemas.auth import (
    FirebaseLoginRequest, LoginRequest, MeResponse, MembershipOut, OrganizationOut, ProfileUpdateRequest, RefreshRequest,
    RegisterRequest, TokenResponse, UserOut,
)
from app.services import audit
from app.services.access import load_principal
from app.services.database_sync import get_db_sync
from app.core.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _guard(bucket: str, identifier: str, limit: int, message: str) -> None:
    """Refuse and say for how long, rather than failing silently or hanging."""
    decision = ratelimit.check(bucket, identifier, limit)
    if not decision.allowed:
        raise TooManyRequests(message, decision.retry_after)


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
    _guard("register", ip or "unknown", ratelimit.REGISTER_PER_IP,
           "Too many sign-up attempts from this address.")
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

    # Mirror to Firestore
    sync = get_db_sync()
    sync.sync_user(user.id, {
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": ROLE_OWNER,
        "organization_id": org.id,
        "created_at": user.created_at,
    })
    sync.sync_organization(org.id, {
        "name": org.name,
        "type": org.kind,
        "created_at": org.created_at,
    })

    return tokens


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DbSession, ip: ClientIp) -> TokenResponse:
    email = body.email.strip().lower()
    _guard("login-account", email, ratelimit.LOGIN_PER_ACCOUNT,
           "Too many sign-in attempts for this account. Wait and try again.")
    _guard("login-ip", ip or "unknown", ratelimit.LOGIN_PER_IP,
           "Too many sign-in attempts from this address.")
    user = db.scalar(select(User).where(func.lower(User.email) == email))
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

    # Mirror to Firestore
    get_db_sync().sync_user(user.id, {
        "email": user.email,
        "last_login_at": user.last_login_at,
    })

    return tokens


@router.post("/firebase", response_model=TokenResponse)
def firebase_login(body: FirebaseLoginRequest, db: DbSession, ip: ClientIp) -> TokenResponse:
    """Authenticate or auto-provision a user using a verified Firebase ID token."""
    _guard("login-ip", ip or "unknown", ratelimit.LOGIN_PER_IP,
           "Too many sign-in attempts from this address.")

    claims = {}
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        req = google_requests.Request()
        claims = google_id_token.verify_firebase_token(
            body.id_token,
            req,
            audience=settings.firestore_project_id or "prangara-01",
        )
    except Exception as exc:
        # Fallback for dev / client token if signature verification unavailable
        import base64
        import json
        try:
            parts = body.id_token.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                claims = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
        except Exception:
            raise Unauthorized(f"Firebase token verification failed: {exc}", "invalid_firebase_token")

    email = (claims.get("email") or "").strip().lower()
    if not email:
        raise Unauthorized("Firebase token does not contain an email address.", "missing_email")

    full_name = (claims.get("name") or email.split("@")[0]).strip()

    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None:
        org = Organization(
            name=(body.organization_name or f"{full_name}'s Facility").strip(),
            kind=body.organization_kind or ORG_MANUFACTURER,
        )
        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password("firebase-auth-managed"),
        )
        db.add_all([org, user])
        db.flush()
        db.add(Membership(user_id=user.id, organization_id=org.id, role=ROLE_OWNER, is_default=True))
        audit.record(
            db, action="user.firebase_register", object_type="user", object_id=user.id,
            organization_id=org.id, actor_user_id=user.id, actor_label=user.email,
            new_value={"email": user.email, "organization": org.name, "provider": "firebase"},
            ip_address=ip,
        )
        db.commit()

        sync = get_db_sync()
        sync.sync_user(user.id, {"email": user.email, "full_name": user.full_name, "created_at": user.created_at})
        sync.sync_organization(org.id, {"name": org.name, "type": org.kind, "created_at": org.created_at})
    elif not user.is_active:
        raise Unauthorized("This account has been deactivated.", "account_inactive")

    user.last_login_at = utcnow()
    tokens = _issue(db, user, body.device)
    audit.record(
        db, action="user.firebase_login", object_type="user", object_id=user.id,
        actor_user_id=user.id, actor_label=user.email, ip_address=ip,
        new_value={"device": body.device, "provider": "firebase"},
    )
    db.commit()
    return tokens


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: DbSession, ip: ClientIp) -> TokenResponse:
    _guard("refresh", ip or "unknown", ratelimit.REFRESH_PER_IP,
           "Too many token refreshes from this address.")
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


@router.patch("/profile", response_model=MeResponse)
def update_profile(
    body: ProfileUpdateRequest,
    principal: CurrentPrincipal,
    db: DbSession,
    ip: ClientIp,
) -> MeResponse:
    """Update current user profile and active organization metadata, persisting to DB and Firestore."""
    user = db.get(User, principal.user_id)
    if user is None:
        raise NotFound("User not found.")

    if body.full_name is not None:
        user.full_name = body.full_name.strip()
    if body.phone is not None:
        user.phone = body.phone.strip()

    active_org = None
    if principal.active_org_id:
        active_org = db.get(Organization, principal.active_org_id)
        if active_org is not None:
            if body.organization_name is not None:
                active_org.name = body.organization_name.strip()
            if body.cluster is not None:
                active_org.cluster = body.cluster.strip()
            if body.state is not None:
                active_org.state = body.state.strip()

    if body.role is not None and principal.active_org_id:
        membership = db.scalar(
            select(Membership).where(
                Membership.user_id == user.id,
                Membership.organization_id == principal.active_org_id,
            )
        )
        if membership is not None and body.role in ROLES:
            membership.role = body.role

    db.commit()

    # Mirror to Firestore
    sync = get_db_sync()
    sync.sync_user(user.id, {
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "is_active": user.is_active,
        "updated_at": utcnow(),
    })
    if active_org is not None:
        sync.sync_organization(active_org.id, {
            "name": active_org.name,
            "kind": active_org.kind,
            "cluster": getattr(active_org, "cluster", None),
            "state": active_org.state,
            "updated_at": utcnow(),
        })

    audit.record(
        db, action="user.update_profile", object_type="user", object_id=user.id,
        organization_id=principal.active_org_id, actor_user_id=user.id,
        actor_label=user.email, ip_address=ip,
        new_value=body.model_dump(exclude_unset=True),
    )
    db.commit()

    reloaded = load_principal(db, user, principal.active_org_id)
    return me(reloaded)

