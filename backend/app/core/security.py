"""
Password hashing and JWT issue/verify.

Two tokens, per PRD FR-01:

  * An access token: stateless HS256 JWT, short-lived, carries the user id and
    a session id. Never stored server-side.
  * A refresh token: opaque random string. Only its SHA-256 is stored, so a
    database dump does not hand an attacker a live session, and a single row
    delete logs out a single device.

`decode_access_token` pins the algorithm explicitly. Accepting whatever `alg`
the token header claims is the classic JWT break, and PyJWT will happily do it
if you pass the algorithm list through from untrusted input.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import secrets
from typing import Any

import bcrypt
import jwt

from app.core.config import settings

# bcrypt truncates at 72 bytes and raises on longer input from 4.x onwards, so
# passwords are capped before hashing rather than at the API boundary only.
_BCRYPT_MAX_BYTES = 72


class TokenError(Exception):
    """Raised when a token is absent, malformed, expired or of the wrong type."""


def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8")[:_BCRYPT_MAX_BYTES], bcrypt.gensalt())


def verify_password(password: str, stored: bytes) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:_BCRYPT_MAX_BYTES], stored)
    except (ValueError, TypeError):
        return False


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def create_access_token(user_id: str, session_id: str,
                        extra: dict[str, Any] | None = None) -> tuple[str, int]:
    """Return (token, expires_in_seconds)."""
    ttl = settings.access_token_minutes * 60
    now = _now()
    payload: dict[str, Any] = {
        "sub": user_id,
        "sid": session_id,
        "typ": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + dt.timedelta(seconds=ttl)).timestamp()),
        "iss": "prangara",
    }
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, ttl


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer="prangara",
            options={"require": ["exp", "sub", "iss"]},
        )
    except jwt.PyJWTError as ex:
        raise TokenError(str(ex)) from ex
    if payload.get("typ") != "access":
        raise TokenError("Not an access token.")
    return payload


def create_refresh_token() -> tuple[str, str, dt.datetime]:
    """Return (plaintext, sha256_hex, expires_at). Only the hash is persisted."""
    raw = secrets.token_urlsafe(48)
    expires = _now() + dt.timedelta(days=settings.refresh_token_days)
    return raw, hash_refresh_token(raw), expires


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
