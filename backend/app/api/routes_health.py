"""Health and readiness. The one endpoint every client calls first."""
from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import func, select, text

from app.api.deps import DbSession
from app.core.config import settings
from app.models.assessment import Assessment
from app.models.factory import Factory
from app.models.identity import User
from app.models.marketplace import Provider
from app.schemas.common import HealthResponse
from engine import ENGINE_VERSION, default_db, intervention_db, reference_versions, sector_db

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health(db: DbSession) -> HealthResponse:
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception as ex:  # pragma: no cover - only on a broken deployment
        database = f"error: {type(ex).__name__}"

    counts = {"users": 0, "factories": 0, "assessments": 0, "providers": 0}
    if database == "ok":
        counts = {
            "users": db.scalar(select(func.count()).select_from(User)) or 0,
            "factories": db.scalar(
                select(func.count()).select_from(Factory).where(Factory.archived_at.is_(None))
            ) or 0,
            "assessments": db.scalar(select(func.count()).select_from(Assessment)) or 0,
            "providers": db.scalar(select(func.count()).select_from(Provider)) or 0,
        }

    return HealthResponse(
        status="ok" if database == "ok" else "degraded",
        app=settings.app_name,
        version=settings.api_version,
        environment=settings.app_env,
        database=database,
        engine={
            "engine_version": ENGINE_VERSION,
            "sectors": len(sector_db().sectors),
            "interventions": len(intervention_db().items),
            "factors": len(default_db().list_keys()),
            "reference_versions": reference_versions(),
        },
        counts=counts,
        features={
            # Honest capability reporting. A client that knows OCR is not
            # configured can hide the scan button instead of offering a feature
            # that will fail, or worse, appear to succeed.
            "postgres": not settings.is_sqlite,
            "object_storage": settings.storage_backend == "minio",
            "llm_intake": bool(settings.ollama_base_url and settings.ollama_model),
        },
    )
