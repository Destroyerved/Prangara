"""
Storage layer.

Raw sqlite3 rather than an ORM, deliberately. The schema is nine tables of
flat rows; an ORM would add a translation layer between what is written and
what is stored, and the whole premise of this product is that every number is
traceable. Parameterised SQL you can read in one sitting serves that better.

The database is created and migrated on import. There is no migration tool -
`SCHEMA` is idempotent and `_migrate()` adds columns that later versions need.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
import uuid
from typing import Any

_HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("CHAKRA_DB", os.path.join(_HERE, "chakra.db"))

_local = threading.local()

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS orgs (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'plant',   -- plant | consultant | corporate
    created_at  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    org_id      TEXT NOT NULL REFERENCES orgs(id),
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    pw_hash     BLOB NOT NULL,
    role        TEXT NOT NULL DEFAULT 'owner',   -- owner | member
    created_at  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    created_at  REAL NOT NULL,
    expires_at  REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS plants (
    id          TEXT PRIMARY KEY,
    org_id      TEXT NOT NULL REFERENCES orgs(id),
    name        TEXT NOT NULL,
    sector      TEXT NOT NULL,
    state       TEXT,
    -- A plant may be a supplier introduced by a corporate customer. That is the
    -- B2B2B cascade: the corporate owns the relationship, the plant owns its data.
    referred_by_org TEXT REFERENCES orgs(id),
    created_at  REAL NOT NULL,
    archived_at REAL
);
CREATE INDEX IF NOT EXISTS ix_plants_org ON plants(org_id);
CREATE INDEX IF NOT EXISTS ix_plants_sector ON plants(sector);

CREATE TABLE IF NOT EXISTS assessments (
    id            TEXT PRIMARY KEY,
    plant_id      TEXT NOT NULL REFERENCES plants(id),
    created_at    REAL NOT NULL,
    label         TEXT,
    profile_json  TEXT NOT NULL,
    result_json   TEXT NOT NULL,
    -- denormalised for fast portfolio rollups and benchmark queries, so we never
    -- parse a result blob just to compute a median
    total_tco2e       REAL,
    scope1_tco2e      REAL,
    scope2_tco2e      REAL,
    scope3_tco2e      REAL,
    scope12_per_t     REAL,
    elec_per_t        REAL,
    thermal_per_t     REAL,
    cp_abatement      REAL,
    cp_benefit_inr    REAL,
    cp_capex_inr      REAL
);
CREATE INDEX IF NOT EXISTS ix_assess_plant ON assessments(plant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS actions (
    id             TEXT PRIMARY KEY,
    plant_id       TEXT NOT NULL REFERENCES plants(id),
    assessment_id  TEXT NOT NULL REFERENCES assessments(id),
    intervention_id TEXT NOT NULL,
    name           TEXT NOT NULL,
    category       TEXT,
    status         TEXT NOT NULL DEFAULT 'planned',  -- planned|in_progress|done|rejected
    est_abatement_tco2e   REAL,
    est_capex_inr         REAL,
    est_annual_benefit_inr REAL,
    est_payback_months    REAL,
    -- what actually happened. The gap between est_ and act_ is the most valuable
    -- data this product will ever hold: it is the realisation rate, measured.
    act_abatement_tco2e   REAL,
    act_capex_inr         REAL,
    act_annual_benefit_inr REAL,
    target_date    TEXT,
    completed_at   REAL,
    rejected_reason TEXT,
    notes          TEXT,
    created_at     REAL NOT NULL,
    updated_at     REAL NOT NULL,
    UNIQUE(plant_id, intervention_id)
);
CREATE INDEX IF NOT EXISTS ix_actions_plant ON actions(plant_id);
CREATE INDEX IF NOT EXISTS ix_actions_status ON actions(status);
"""


def _conn() -> sqlite3.Connection:
    c = getattr(_local, "conn", None)
    if c is None:
        c = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=15)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA foreign_keys=ON")
        _local.conn = c
    return c


def init() -> None:
    c = _conn()
    c.executescript(SCHEMA)
    c.commit()


def query(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    cur = _conn().execute(sql, params)
    return [dict(r) for r in cur.fetchall()]


def one(sql: str, params: tuple = ()) -> dict[str, Any] | None:
    cur = _conn().execute(sql, params)
    r = cur.fetchone()
    return dict(r) if r else None


def execute(sql: str, params: tuple = ()) -> None:
    c = _conn()
    c.execute(sql, params)
    c.commit()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def now() -> float:
    return time.time()


def jdump(o: Any) -> str:
    return json.dumps(o, separators=(",", ":"), default=str)


def jload(s: str | None) -> Any:
    return json.loads(s) if s else None


init()
