"""
PRANGARA platform API.

Modular monolith, as PRD section 23 requires. One FastAPI app, one database,
clear module boundaries inside it, no microservices.

Surfaces:

  * Anonymous sandbox - `/api/assess`, `/api/demo/{sector}`, `/api/sectors`,
    `/api/reference`. Stateless, no account, identical engine. Preserved from
    the PS10 prototype so the public demo keeps working.
  * Signed-in platform - everything under an authenticated principal, scoped by
    organization and persisted with a version stamp.

Both call the same deterministic engine. The only difference is whether the
result is written down.
"""
from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s  %(message)s",
)
log = logging.getLogger("prangara")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    from engine import ENGINE_VERSION, reference_versions

    log.info("PRANGARA %s starting in %s", settings.api_version, settings.app_env)
    log.info("engine %s, reference %s", ENGINE_VERSION, reference_versions())
    if settings.is_sqlite:
        log.warning(
            "Using SQLite at %s. Fine for local development and the demo; set "
            "DATABASE_URL to PostgreSQL for PostGIS and pgvector features.",
            settings.database_url,
        )
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        lifespan=lifespan,
        title="PRANGARA",
        description=(
            "Industrial Carbon Intelligence Network. "
            "Measure, detect, decide, connect, implement, verify. "
            "Screening and decision support - not an accredited audit, legal "
            "assurance service or carbon-credit verification."
        ),
        version=settings.api_version,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id"],
    )

    # Every error leaves as {"error": {"code", "message", "details"}}. Clients
    # parse one shape; a mobile app in particular should never have to branch on
    # whether FastAPI or our own code produced the failure.
    @application.exception_handler(StarletteHTTPException)
    async def _http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail
        if isinstance(detail, dict) and "code" in detail:
            body = detail
        else:
            body = {"code": f"http_{exc.status_code}", "message": str(detail), "details": {}}
        return JSONResponse(status_code=exc.status_code, content={"error": body},
                            headers=getattr(exc, "headers", None))

    @application.exception_handler(RequestValidationError)
    async def _validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"error": {
            "code": "validation_error",
            "message": "One or more fields are invalid.",
            "details": {"errors": _serialisable(exc.errors())},
        }})

    from app.api import (  # noqa: PLC0415 - imported here to avoid a circular import
        routes_actions, routes_assessments, routes_auth, routes_compliance,
        routes_evidence, routes_factories, routes_health, routes_intake,
        routes_marketplace, routes_notifications, routes_org, routes_reference,
        routes_sandbox,
    )

    for module in (
        routes_health, routes_auth, routes_reference, routes_sandbox,
        routes_org, routes_factories, routes_assessments, routes_intake,
        routes_evidence, routes_marketplace, routes_actions, routes_compliance,
        routes_notifications,
    ):
        application.include_router(module.router)

    return application


def _serialisable(errors: list) -> list:
    """Pydantic v2 validation errors can carry non-JSON `ctx` values."""
    out = []
    for err in errors:
        clean = {k: v for k, v in err.items() if k != "ctx"}
        if "ctx" in err:
            clean["ctx"] = {k: str(v) for k, v in err["ctx"].items()}
        out.append(clean)
    return out


app = create_app()
