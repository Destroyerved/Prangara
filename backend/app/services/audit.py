"""
Audit writing. PRD FR-48.

`record` appends one immutable row. It is called inside the same transaction as
the change it describes, so an audit entry cannot survive a rollback and a
committed change cannot lack its entry.

Values are redacted before storage: an audit log that captures a password hash
or a full document body is a second copy of the thing you were protecting.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.base import utcnow
from app.models.governance import AuditLog

# Field names never written to the audit log, whatever object they appear on.
_REDACT = {
    "password", "password_hash", "pw_hash", "token", "token_hash",
    "refresh_token", "access_token", "secret", "jwt_secret",
}
_MAX_VALUE_CHARS = 2000


def _clean(value: Any) -> Any:
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            if k.lower() in _REDACT:
                out[k] = "[redacted]"
            else:
                out[k] = _clean(v)
        return out
    if isinstance(value, (list, tuple)):
        return [_clean(v) for v in value][:50]
    if isinstance(value, str) and len(value) > _MAX_VALUE_CHARS:
        return value[:_MAX_VALUE_CHARS] + "...[truncated]"
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    return str(value)[:_MAX_VALUE_CHARS]


def record(db: Session, *, action: str, object_type: str, object_id: str,
           organization_id: str | None = None, actor_user_id: str | None = None,
           actor_label: str | None = None, old_value: dict[str, Any] | None = None,
           new_value: dict[str, Any] | None = None, reason: str | None = None,
           evidence_ids: list[str] | None = None, correlation_id: str | None = None,
           ip_address: str | None = None) -> AuditLog:
    entry = AuditLog(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        actor_label=actor_label,
        action=action,
        object_type=object_type,
        object_id=object_id,
        old_value=_clean(old_value) if old_value is not None else None,
        new_value=_clean(new_value) if new_value is not None else None,
        reason=reason,
        evidence_ids=evidence_ids or [],
        correlation_id=correlation_id,
        ip_address=ip_address,
        created_at=utcnow(),
    )
    db.add(entry)
    return entry


def diff(before: dict[str, Any], after: dict[str, Any]) -> tuple[dict, dict]:
    """Only the keys that actually changed, so the log stays readable."""
    changed = [k for k in after if before.get(k) != after.get(k)]
    return ({k: before.get(k) for k in changed}, {k: after.get(k) for k in changed})
