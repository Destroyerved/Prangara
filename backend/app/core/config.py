"""
Runtime configuration.

Everything that differs between a laptop, the demo box and a real deployment is
read from the environment. `.env.example` at the repo root lists every key.

One deliberate deviation from PRD section 24, which names PostgreSQL: the
default `DATABASE_URL` is a local SQLite file. PRD section 30 requires that the
seeded demo always works and that core assessment never depends on an external
service, and a judge's laptop with no Postgres running must still get a working
API. Every model is written against portable SQLAlchemy types, so pointing
DATABASE_URL at PostgreSQL is a one-line change and the migrations run on both.
PostGIS/pgvector features (BE-2's logistics and RAG work) require PostgreSQL.
"""
from __future__ import annotations

import os
from functools import lru_cache


def _bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, "") or default)
    except ValueError:
        return default


class Settings:
    def __init__(self) -> None:
        here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

        self.app_env: str = os.environ.get("APP_ENV", "development")
        self.app_name: str = "PRANGARA"
        self.api_version: str = "2.0.0"

        self.database_url: str = os.environ.get(
            "DATABASE_URL", f"sqlite:///{os.path.join(here, 'prangara.db')}"
        )
        self.database_backend: str = os.environ.get("DATABASE_BACKEND", "sqlite").lower()
        self.firestore_project_id: str = os.environ.get("FIRESTORE_PROJECT_ID", "")
        self.firebase_credentials_json: str = os.environ.get("FIREBASE_CREDENTIALS_JSON", "")
        self.sql_echo: bool = _bool("SQL_ECHO", False)

        # JWT. In development a stable fallback keeps tokens valid across
        # reloads; in any other environment a missing secret is fatal rather
        # than silently insecure.
        self.jwt_secret: str = os.environ.get("JWT_SECRET", "")
        if not self.jwt_secret:
            if self.app_env == "development":
                self.jwt_secret = "dev-only-insecure-secret-change-me"
            else:
                raise RuntimeError("JWT_SECRET must be set when APP_ENV is not 'development'")
        self.jwt_algorithm: str = "HS256"
        self.access_token_minutes: int = _int("ACCESS_TOKEN_MINUTES", 30)
        self.refresh_token_days: int = _int("REFRESH_TOKEN_DAYS", 30)

        # Evidence storage. MinIO/S3 when configured, local filesystem otherwise
        # so that evidence upload works on a laptop with nothing else running.
        self.storage_backend: str = os.environ.get("STORAGE_BACKEND", "local")
        self.storage_local_dir: str = os.environ.get(
            "STORAGE_LOCAL_DIR", os.path.join(here, "var", "evidence")
        )
        self.minio_endpoint: str = os.environ.get("MINIO_ENDPOINT", "")
        self.minio_access_key: str = os.environ.get("MINIO_ACCESS_KEY", "")
        self.minio_secret_key: str = os.environ.get("MINIO_SECRET_KEY", "")
        self.minio_bucket: str = os.environ.get("MINIO_BUCKET", "prangara-evidence")
        self.minio_secure: bool = _bool("MINIO_SECURE", False)
        self.max_upload_mb: int = _int("MAX_UPLOAD_MB", 25)

        # AI intake. Owned by BE-2; BE-1 only needs to know whether a runtime is
        # configured so the intake endpoints can degrade honestly instead of
        # inventing extractions.
        self.ollama_base_url: str = os.environ.get("OLLAMA_BASE_URL", "")
        self.ollama_model: str = os.environ.get("OLLAMA_MODEL", "")
        self.ollama_vision_model: str = os.environ.get("OLLAMA_VISION_MODEL", "")

        self.cors_origins: list[str] = [
            o.strip() for o in os.environ.get(
                "CORS_ORIGINS",
                "http://localhost:5173,http://localhost:3000,http://localhost:8081,http://localhost:19006",
            ).split(",") if o.strip()
        ]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_firestore(self) -> bool:
        return self.database_backend == "firestore"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
