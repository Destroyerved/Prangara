"""
Authentication.

Server-side sessions in a table rather than stateless JWTs. For this product
that is the right trade: sessions are revocable, there is no key-rotation
problem, and an SME owner who suspects their account is compromised can be
logged out everywhere by deleting rows. JWTs would buy horizontal scale we do
not need at a scale we are not at.

Passwords are bcrypt with a per-password salt (bcrypt generates and embeds it).
"""
from __future__ import annotations

import re
import secrets
from typing import Any

import bcrypt
from fastapi import Cookie, HTTPException

import db

SESSION_DAYS = 30
COOKIE = "chakra_session"

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


# ---------------------------------------------------------------------------
# passwords
# ---------------------------------------------------------------------------

def hash_password(pw: str) -> bytes:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt())


def verify_password(pw: str, stored: bytes) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), stored)
    except (ValueError, TypeError):
        return False


def validate_credentials(email: str, password: str) -> None:
    if not _EMAIL.match(email or ""):
        raise HTTPException(400, "That does not look like a valid email address.")
    if len(password or "") < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")


# ---------------------------------------------------------------------------
# registration and login
# ---------------------------------------------------------------------------

def register(email: str, password: str, name: str,
             org_name: str, org_kind: str = "plant") -> dict[str, Any]:
    email = (email or "").strip().lower()
    validate_credentials(email, password)
    if db.one("SELECT id FROM users WHERE email=?", (email,)):
        raise HTTPException(409, "An account with that email already exists.")
    if org_kind not in ("plant", "consultant", "corporate"):
        org_kind = "plant"

    org_id = db.new_id("org")
    user_id = db.new_id("usr")
    t = db.now()
    db.execute("INSERT INTO orgs(id,name,kind,created_at) VALUES(?,?,?,?)",
               (org_id, (org_name or name or email).strip(), org_kind, t))
    db.execute(
        "INSERT INTO users(id,org_id,email,name,pw_hash,role,created_at) VALUES(?,?,?,?,?,?,?)",
        (user_id, org_id, email, (name or email.split("@")[0]).strip(),
         hash_password(password), "owner", t))
    return {"user_id": user_id, "org_id": org_id}


def login(email: str, password: str) -> str:
    email = (email or "").strip().lower()
    u = db.one("SELECT * FROM users WHERE email=?", (email,))
    # Same message whether the account is missing or the password is wrong, so
    # the endpoint cannot be used to enumerate registered email addresses.
    if not u or not verify_password(password, u["pw_hash"]):
        raise HTTPException(401, "Email or password is incorrect.")
    return issue_session(u["id"])


def issue_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    t = db.now()
    db.execute("INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)",
               (token, user_id, t, t + SESSION_DAYS * 86400))
    return token


def logout(token: str | None) -> None:
    if token:
        db.execute("DELETE FROM sessions WHERE token=?", (token,))


# ---------------------------------------------------------------------------
# request-time resolution
# ---------------------------------------------------------------------------

def resolve(token: str | None) -> dict[str, Any] | None:
    """Return the current user+org, or None. Never raises."""
    if not token:
        return None
    row = db.one(
        """SELECT u.id AS user_id, u.email, u.name, u.role,
                  o.id AS org_id, o.name AS org_name, o.kind AS org_kind,
                  s.expires_at
           FROM sessions s JOIN users u ON u.id = s.user_id
                           JOIN orgs  o ON o.id = u.org_id
           WHERE s.token = ?""", (token,))
    if not row:
        return None
    if row["expires_at"] < db.now():
        db.execute("DELETE FROM sessions WHERE token=?", (token,))
        return None
    row.pop("expires_at", None)
    return row


def current_user(chakra_session: str | None = Cookie(default=None)) -> dict[str, Any]:
    """FastAPI dependency. Requires a signed-in user."""
    u = resolve(chakra_session)
    if not u:
        raise HTTPException(401, "Sign in to continue.")
    return u


def optional_user(chakra_session: str | None = Cookie(default=None)) -> dict[str, Any] | None:
    """FastAPI dependency. Allows anonymous - used by the public sandbox."""
    return resolve(chakra_session)
