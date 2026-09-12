"""
Single resolution point for the engine's reference-data directory.

The engine is pure and deterministic, but it does read three JSON files:
emission factors, sector benchmarks and the intervention library. Those files
are owned by BE-2 (see task.md), not by the engine, so the path lives in one
place rather than being recomputed with nested dirname() calls in three modules.

`PRANGARA_REFERENCE_DIR` lets BE-2 point the engine at a different snapshot
(a frozen pre-demo version, or a test fixture) without editing engine code.
"""
from __future__ import annotations

import os

_DEFAULT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),  # backend/
    "data", "reference",
)

DATA_DIR: str = os.environ.get("PRANGARA_REFERENCE_DIR") or _DEFAULT


def reference_file(name: str) -> str:
    return os.path.join(DATA_DIR, name)
