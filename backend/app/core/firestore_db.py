"""
Google Cloud Firestore client initialization and connection management.
Supports:
1. Environment variable FIREBASE_CREDENTIALS_JSON (raw JSON string or base64-encoded)
2. GOOGLE_APPLICATION_CREDENTIALS path
3. Local Firestore emulator (FIRESTORE_EMULATOR_HOST)
4. Default Google Cloud application credentials
"""
from __future__ import annotations

import base64
import json
import logging
import os
from functools import lru_cache
from typing import Any

logger = logging.getLogger("prangara.firestore")

_firestore_client = None


def get_firestore_client() -> Any:
    """Returns a singleton instance of google.cloud.firestore.Client."""
    global _firestore_client
    if _firestore_client is not None:
        return _firestore_client

    try:
        from google.cloud import firestore
        from google.oauth2 import service_account
    except ImportError:
        logger.warning("google-cloud-firestore is not installed. Firestore database backend is disabled.")
        return None

    project_id = os.environ.get("FIRESTORE_PROJECT_ID") or os.environ.get("GCP_PROJECT_ID")
    raw_creds = os.environ.get("FIREBASE_CREDENTIALS_JSON")

    if raw_creds:
        try:
            # Handle base64 encoded credentials if provided
            if not raw_creds.strip().startswith("{"):
                raw_creds = base64.b64decode(raw_creds).decode("utf-8")
            cred_dict = json.loads(raw_creds)
            creds = service_account.Credentials.from_service_account_info(cred_dict)
            client = firestore.Client(project=project_id or cred_dict.get("project_id"), credentials=creds)
            logger.info("Connected to Firestore using FIREBASE_CREDENTIALS_JSON.")
            _firestore_client = client
            return _firestore_client
        except Exception as e:
            logger.error(f"Failed to load credentials from FIREBASE_CREDENTIALS_JSON: {e}")

    # Check well-known local key file paths (e.g. src/api/firestore-api.json)
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    candidates = [
        os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"),
        os.path.join(repo_root, "src", "api", "firestore-api.json"),
        os.path.join(repo_root, "serviceAccountKey.json"),
        os.path.join(repo_root, "backend", "serviceAccountKey.json"),
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            try:
                creds = service_account.Credentials.from_service_account_file(path)
                client = firestore.Client(project=project_id or getattr(creds, "project_id", "prangara-01"), credentials=creds)
                logger.info(f"Connected to Firestore using key file: {path}")
                _firestore_client = client
                return _firestore_client
            except Exception as e:
                logger.warning(f"Failed to load credentials from {path}: {e}")

    # Fallback to standard environment or emulator
    try:
        client = firestore.Client(project=project_id)
        logger.info(f"Connected to Firestore (project={client.project}).")
        _firestore_client = client
        return _firestore_client
    except Exception as e:
        logger.warning(f"Could not connect to Firestore: {e}. Falling back to default database.")
        return None


def is_firestore_enabled() -> bool:
    """Check if Firestore is configured and available."""
    backend = os.environ.get("DATABASE_BACKEND", "").lower()
    return backend == "firestore"
