"""
Version stamping for reproducibility.

PRD section 30 (Auditability) requires every persisted assessment to record the
engine version and the version of every reference dataset it consumed, so that
the same profile re-run against the same versions produces the same answer and
a historical assessment is never silently rewritten when a factor changes.

Reference datasets declare a `meta.schema_version`, which moves only when the
shape changes. That is not enough to identify the *content* an assessment used,
so we also take a SHA-256 of the file bytes. The short digest is what actually
pins a result; the declared version is what a human reads.
"""
from __future__ import annotations

import hashlib
import json
import os
from functools import lru_cache
from typing import Any

from .paths import DATA_DIR

# Bumped by hand whenever calculation behaviour changes. Ported unchanged from
# the PS10 prototype engine, hence 1.0.0 rather than 0.x.
ENGINE_VERSION = "1.0.0"

_FILES = {
    "factors": "emission_factors.json",
    "sectors": "sectors.json",
    "interventions": "interventions.json",
}


def _digest(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(65536), b""):
            h.update(block)
    return h.hexdigest()[:16]


@lru_cache(maxsize=1)
def reference_versions() -> dict[str, dict[str, str]]:
    """{'factors': {'schema_version': '1.0', 'content_hash': 'abc...'}, ...}"""
    out: dict[str, dict[str, str]] = {}
    for key, filename in _FILES.items():
        path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(path):
            out[key] = {"schema_version": "missing", "content_hash": "missing"}
            continue
        with open(path, "r", encoding="utf-8") as fh:
            meta = json.load(fh).get("meta", {})
        out[key] = {
            "schema_version": str(meta.get("schema_version", "unversioned")),
            "content_hash": _digest(path),
        }
    return out


def version_stamp() -> dict[str, Any]:
    """The block persisted alongside every assessment snapshot."""
    refs = reference_versions()
    return {
        "engine_version": ENGINE_VERSION,
        "factor_version": refs["factors"]["schema_version"],
        "factor_hash": refs["factors"]["content_hash"],
        "sector_version": refs["sectors"]["schema_version"],
        "sector_hash": refs["sectors"]["content_hash"],
        "intervention_version": refs["interventions"]["schema_version"],
        "intervention_hash": refs["interventions"]["content_hash"],
        "reference_dir": DATA_DIR,
    }
