"""Auth and identity DTOs."""
from __future__ import annotations

import datetime as dt

from pydantic import EmailStr, Field, field_validator

from app.models.identity import ORG_KINDS, ROLES
from app.schemas.common import ApiModel


class RegisterRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(default="", max_length=160)
    organization_name: str = Field(default="", max_length=200)
    organization_kind: str = "manufacturer"
    phone: str | None = Field(default=None, max_length=24)

    @field_validator("organization_kind")
    @classmethod
    def _kind(cls, v: str) -> str:
        if v not in ORG_KINDS:
            raise ValueError(f"organization_kind must be one of {', '.join(ORG_KINDS)}")
        return v


class LoginRequest(ApiModel):
    email: EmailStr
    password: str
    device: str | None = Field(default=None, max_length=120)


class RefreshRequest(ApiModel):
    refresh_token: str


class TokenResponse(ApiModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class OrganizationOut(ApiModel):
    id: str
    name: str
    kind: str
    state: str | None = None
    country: str | None = None


class MembershipOut(ApiModel):
    organization: OrganizationOut
    role: str
    is_default: bool


class UserOut(ApiModel):
    id: str
    email: str
    full_name: str
    phone: str | None = None
    is_active: bool
    created_at: dt.datetime
    last_login_at: dt.datetime | None = None


class MeResponse(ApiModel):
    user: UserOut
    memberships: list[MembershipOut]
    active_organization_id: str | None
    is_platform_admin: bool
    permissions: list[str]


class InviteMemberRequest(ApiModel):
    email: EmailStr
    role: str = "member"
    full_name: str = ""

    @field_validator("role")
    @classmethod
    def _role(cls, v: str) -> str:
        if v not in ROLES:
            raise ValueError(f"role must be one of {', '.join(ROLES)}")
        return v


class GrantFactoryAccessRequest(ApiModel):
    email: EmailStr
    level: str = "read"
    expires_at: dt.datetime | None = None

    @field_validator("level")
    @classmethod
    def _level(cls, v: str) -> str:
        if v not in ("read", "write"):
            raise ValueError("level must be 'read' or 'write'")
        return v


class FactoryAccessOut(ApiModel):
    id: str
    user_id: str
    factory_id: str
    level: str
    granted_by_user_id: str | None = None
    expires_at: dt.datetime | None = None
    revoked_at: dt.datetime | None = None
