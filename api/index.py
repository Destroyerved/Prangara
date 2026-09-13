"""
Vercel Serverless Function entrypoint for PRANGARA FastAPI platform.
Routes all /api/* requests to the FastAPI application instance.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Add project root and backend directory to Python path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Signal serverless execution environment
os.environ["VERCEL"] = "1"

# Import the FastAPI application
from backend.app.main import app
