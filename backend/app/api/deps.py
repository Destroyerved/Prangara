"""FastAPI dependencies: database session, authenticated principal, RBAC gates."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import Unauthorized
from app.core.security import TokenError, decode_access_token
from app.models.identity import User
from app.services.access import Principal, load_principal

DbSession = Annotated[Session, Depends(get_db)]


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise Unauthorized()
    token = authorization[7:].strip()
    if not token:
        raise Unauthorized()
    return token


def get_principal(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
    x_organization_id: Annotated[str | None, Header()] = None,
) -> Principal:
    """Resolve the caller. Raises 401 if the token is missing, bad or revoked.

    `X-Organization-Id` lets a user who belongs to several organizations say
    which one they are acting in. It can only select among organizations they
    are already a member of; an unknown value falls back to their default rather
    than granting anything.
    """
    payload = None
    try:
        payload = decode_access_token(_bearer(authorization))
    except TokenError as ex:
        raise Unauthorized(f"Session is not valid: {ex}") from ex

    user = db.get(User, payload.get("sub", ""))
    if user is None or not user.is_active:
        raise Unauthorized("Account is not active.")
    return load_principal(db, user, x_organization_id)


CurrentPrincipal = Annotated[Principal, Depends(get_principal)]


def get_optional_principal(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
    x_organization_id: Annotated[str | None, Header()] = None,
) -> Principal | None:
    """For endpoints that work signed-out, such as the anonymous sandbox."""
    if not authorization:
        return None
    try:
        return get_principal(db, authorization, x_organization_id)
    except Unauthorized:
        return None


OptionalPrincipal = Annotated[Principal | None, Depends(get_optional_principal)]


def client_ip(request: Request) -> str | None:
    """Best-effort caller IP for the audit log.

    `X-Forwarded-For` is only trusted to the extent that it is recorded; it is
    never used for an access decision, because a client can set it freely.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host if request.client else None


ClientIp = Annotated[str | None, Depends(client_ip)]
