"""Typed API errors, so every failure reaches the client in one shape."""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException


class ApiError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str,
                 details: dict[str, Any] | None = None) -> None:
        super().__init__(status_code=status_code, detail={
            "code": code, "message": message, "details": details or {},
        })


class BadRequest(ApiError):
    def __init__(self, message: str, code: str = "bad_request",
                 details: dict[str, Any] | None = None) -> None:
        super().__init__(400, code, message, details)


class Unauthorized(ApiError):
    def __init__(self, message: str = "Sign in to continue.",
                 code: str = "unauthorized") -> None:
        super().__init__(401, code, message)


class Forbidden(ApiError):
    def __init__(self, message: str = "You do not have access to this.",
                 code: str = "forbidden") -> None:
        super().__init__(403, code, message)


class NotFound(ApiError):
    """404 is also what a cross-tenant read returns.

    Answering 403 on an object that exists in another organization confirms it
    exists. Everything the caller cannot reach is simply not found.
    """

    def __init__(self, message: str = "Not found.", code: str = "not_found") -> None:
        super().__init__(404, code, message)


class Conflict(ApiError):
    def __init__(self, message: str, code: str = "conflict",
                 details: dict[str, Any] | None = None) -> None:
        super().__init__(409, code, message, details)


class PayloadTooLarge(ApiError):
    def __init__(self, message: str, code: str = "payload_too_large") -> None:
        super().__init__(413, code, message)


class UnprocessableEntity(ApiError):
    def __init__(self, message: str, code: str = "unprocessable",
                 details: dict[str, Any] | None = None) -> None:
        super().__init__(422, code, message, details)


class NotImplementedYet(ApiError):
    """Reserved for contracts that are defined but owned by another role.

    Returning this is honest. Returning a plausible fabricated payload from an
    unimplemented endpoint is the failure mode AI_AGENT_PLAYBOOK section 1 calls
    out, and it is worse than a 501 because nobody notices it.
    """

    def __init__(self, message: str, owner: str = "") -> None:
        super().__init__(501, "not_implemented", message, {"owner": owner} if owner else {})
