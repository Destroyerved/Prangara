"""
Data access for plants, assessments and actions.

Every function that reads or writes plant data takes an `org_id` and scopes the
query by it. Authorisation is enforced here, at the data boundary, rather than
in the route handlers - a route that forgets the check cannot leak another
organisation's plants, because there is no query in this module that would
return them.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException

import benchmarks as bm
import db
from engine import assess as run_engine

ACTION_STATUSES = ("recommended", "planned", "in_progress", "done", "rejected")


# ---------------------------------------------------------------------------
# plants
# ---------------------------------------------------------------------------

def create_plant(org_id: str, name: str, sector: str, state: str | None,
                 referred_by: str | None = None) -> dict[str, Any]:
    from engine.leaks import sector_db
    try:
        sector_db().get(sector)
    except KeyError:
        raise HTTPException(400, f"Unknown sector '{sector}'.")
    if not (name or "").strip():
        raise HTTPException(400, "Plant name is required.")

    pid = db.new_id("plt")
    db.execute(
        """INSERT INTO plants(id,org_id,name,sector,state,referred_by_org,created_at)
           VALUES(?,?,?,?,?,?,?)""",
        (pid, org_id, name.strip(), sector, state, referred_by, db.now()))
    return get_plant(org_id, pid)


def get_plant(org_id: str, plant_id: str) -> dict[str, Any]:
    p = db.one("SELECT * FROM plants WHERE id=? AND org_id=? AND archived_at IS NULL",
               (plant_id, org_id))
    if not p:
        raise HTTPException(404, "Plant not found.")
    return p


def list_plants(org_id: str) -> list[dict[str, Any]]:
    """Plants with their latest assessment headline, for the portfolio list."""
    return db.query(
        """
        SELECT p.*,
               a.id AS last_assessment_id, a.created_at AS last_assessed_at,
               a.total_tco2e, a.scope3_tco2e, a.cp_abatement, a.cp_benefit_inr,
               (SELECT COUNT(*) FROM actions x WHERE x.plant_id=p.id AND x.status='done')       AS actions_done,
               (SELECT COUNT(*) FROM actions x WHERE x.plant_id=p.id AND x.status IN ('planned','in_progress')) AS actions_active
        FROM plants p
        LEFT JOIN (
            SELECT plant_id, MAX(created_at) AS mx FROM assessments GROUP BY plant_id
        ) l ON l.plant_id = p.id
        LEFT JOIN assessments a ON a.plant_id = p.id AND a.created_at = l.mx
        WHERE p.org_id = ? AND p.archived_at IS NULL
        ORDER BY p.created_at DESC
        """, (org_id,))


def archive_plant(org_id: str, plant_id: str) -> None:
    get_plant(org_id, plant_id)
    db.execute("UPDATE plants SET archived_at=? WHERE id=? AND org_id=?",
               (db.now(), plant_id, org_id))


# ---------------------------------------------------------------------------
# assessments
# ---------------------------------------------------------------------------

def run_assessment(org_id: str, plant_id: str, profile: dict[str, Any],
                   label: str | None = None) -> dict[str, Any]:
    """Run the engine against the live benchmark corpus and persist the result."""
    plant = get_plant(org_id, plant_id)

    profile = dict(profile or {})
    # The plant record is authoritative for identity; the submitted profile only
    # carries activity data. This stops a client renaming or re-sectoring a plant
    # through the assessment endpoint.
    profile["sector"] = plant["sector"]
    profile["name"] = plant["name"]
    profile.setdefault("state", plant["state"])

    blend = bm.blended_benchmarks(plant["sector"], exclude_plant_id=plant_id)
    result = run_engine(profile, blend["benchmarks"], blend["provenance"])

    fp = result["footprint"]
    inten = fp.get("intensities", {})
    cp = result["recommendations"]["portfolio"]["cash_positive_only"]

    aid = db.new_id("asm")
    db.execute(
        """INSERT INTO assessments(
               id,plant_id,created_at,label,profile_json,result_json,
               total_tco2e,scope1_tco2e,scope2_tco2e,scope3_tco2e,
               scope12_per_t,elec_per_t,thermal_per_t,
               cp_abatement,cp_benefit_inr,cp_capex_inr)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (aid, plant_id, db.now(), label, db.jdump(profile), db.jdump(result),
         fp["total_tco2e"], fp["scope1_tco2e"], fp["scope2_tco2e"], fp["scope3_tco2e"],
         inten.get("scope12_tco2e_per_t"), inten.get("electricity_kwh_per_t"),
         inten.get("thermal_gj_per_t"),
         cp["abatement_tco2e"], cp["net_annual_benefit_inr"], cp["capex_inr"]))

    _sync_actions(plant_id, aid, result["recommendations"]["recommendations"])
    result["assessment_id"] = aid
    result["plant_id"] = plant_id
    return result


def _sync_actions(plant_id: str, assessment_id: str, recs: list[dict[str, Any]]) -> None:
    """Create or refresh an action row per recommendation.

    Estimates are refreshed on every reassessment, but any status the user has
    set - and any actuals they have recorded - are preserved. A reassessment
    must never silently reset someone's implementation tracker.
    """
    t = db.now()
    existing = {r["intervention_id"]: r for r in
                db.query("SELECT * FROM actions WHERE plant_id=?", (plant_id,))}

    for r in recs:
        iid = r["id"]
        est = (r["portfolio_abatement_tco2e"], r["capex_inr"],
               r["net_annual_benefit_inr"], r.get("payback_months"))
        if iid in existing:
            db.execute(
                """UPDATE actions SET assessment_id=?, name=?, category=?,
                       est_abatement_tco2e=?, est_capex_inr=?,
                       est_annual_benefit_inr=?, est_payback_months=?, updated_at=?
                   WHERE plant_id=? AND intervention_id=?""",
                (assessment_id, r["name"], r["category"], *est, t, plant_id, iid))
        else:
            db.execute(
                """INSERT INTO actions(
                       id,plant_id,assessment_id,intervention_id,name,category,status,
                       est_abatement_tco2e,est_capex_inr,est_annual_benefit_inr,
                       est_payback_months,created_at,updated_at)
                   VALUES(?,?,?,?,?,?,'recommended',?,?,?,?,?,?)""",
                (db.new_id("act"), plant_id, assessment_id, iid, r["name"],
                 r["category"], *est, t, t))

    # An intervention that no longer applies (the plant stopped buying that
    # material, say) is retired - unless the user already acted on it, in which
    # case the history is theirs and we keep it.
    current = {r["id"] for r in recs}
    for iid, row in existing.items():
        if iid not in current and row["status"] == "recommended":
            db.execute("DELETE FROM actions WHERE plant_id=? AND intervention_id=?",
                       (plant_id, iid))


def list_assessments(org_id: str, plant_id: str) -> list[dict[str, Any]]:
    get_plant(org_id, plant_id)
    return db.query(
        """SELECT id,created_at,label,total_tco2e,scope1_tco2e,scope2_tco2e,scope3_tco2e,
                  scope12_per_t,elec_per_t,thermal_per_t,cp_abatement,cp_benefit_inr,cp_capex_inr
           FROM assessments WHERE plant_id=? ORDER BY created_at DESC""", (plant_id,))


def get_assessment(org_id: str, assessment_id: str) -> dict[str, Any]:
    row = db.one(
        """SELECT a.*, p.org_id, p.name AS plant_name FROM assessments a
           JOIN plants p ON p.id = a.plant_id WHERE a.id = ?""", (assessment_id,))
    if not row or row["org_id"] != org_id:
        raise HTTPException(404, "Assessment not found.")
    result = db.jload(row["result_json"])
    result["assessment_id"] = row["id"]
    result["plant_id"] = row["plant_id"]
    result["created_at"] = row["created_at"]
    return result


# ---------------------------------------------------------------------------
# actions
# ---------------------------------------------------------------------------

def list_actions(org_id: str, plant_id: str) -> list[dict[str, Any]]:
    get_plant(org_id, plant_id)
    return db.query(
        """SELECT * FROM actions WHERE plant_id=?
           ORDER BY CASE status WHEN 'done' THEN 0 WHEN 'in_progress' THEN 1
                                WHEN 'planned' THEN 2 WHEN 'recommended' THEN 3 ELSE 4 END,
                    est_annual_benefit_inr DESC""", (plant_id,))


def update_action(org_id: str, plant_id: str, intervention_id: str,
                  patch: dict[str, Any]) -> dict[str, Any]:
    get_plant(org_id, plant_id)
    row = db.one("SELECT * FROM actions WHERE plant_id=? AND intervention_id=?",
                 (plant_id, intervention_id))
    if not row:
        raise HTTPException(404, "Action not found.")

    status = patch.get("status", row["status"])
    if status not in ACTION_STATUSES:
        raise HTTPException(400, f"Status must be one of {', '.join(ACTION_STATUSES)}.")

    completed = row["completed_at"]
    if status == "done" and not completed:
        completed = db.now()
    if status != "done":
        completed = None

    fields = {
        "status": status,
        "act_abatement_tco2e": patch.get("act_abatement_tco2e", row["act_abatement_tco2e"]),
        "act_capex_inr": patch.get("act_capex_inr", row["act_capex_inr"]),
        "act_annual_benefit_inr": patch.get("act_annual_benefit_inr", row["act_annual_benefit_inr"]),
        "target_date": patch.get("target_date", row["target_date"]),
        "rejected_reason": patch.get("rejected_reason", row["rejected_reason"]),
        "notes": patch.get("notes", row["notes"]),
        "completed_at": completed,
        "updated_at": db.now(),
    }
    db.execute(
        f"UPDATE actions SET {', '.join(k + '=?' for k in fields)} "
        "WHERE plant_id=? AND intervention_id=?",
        (*fields.values(), plant_id, intervention_id))
    return db.one("SELECT * FROM actions WHERE plant_id=? AND intervention_id=?",
                  (plant_id, intervention_id))


# ---------------------------------------------------------------------------
# portfolio
# ---------------------------------------------------------------------------

def portfolio(org_id: str) -> dict[str, Any]:
    """Org-wide rollup. This is the consultant and corporate view."""
    plants = list_plants(org_id)
    assessed = [p for p in plants if p.get("total_tco2e") is not None]

    total_fp = sum(float(p["total_tco2e"] or 0) for p in assessed)
    total_s3 = sum(float(p["scope3_tco2e"] or 0) for p in assessed)
    total_cp = sum(float(p["cp_abatement"] or 0) for p in assessed)
    total_benefit = sum(float(p["cp_benefit_inr"] or 0) for p in assessed)

    real = bm.realisation_stats(org_id)

    by_sector: dict[str, dict[str, Any]] = {}
    for p in assessed:
        s = by_sector.setdefault(p["sector"], {"sector": p["sector"], "plants": 0, "tco2e": 0.0})
        s["plants"] += 1
        s["tco2e"] += float(p["total_tco2e"] or 0)
    for s in by_sector.values():
        s["tco2e"] = round(s["tco2e"], 1)

    return {
        "plants_total": len(plants),
        "plants_assessed": len(assessed),
        "total_footprint_tco2e": round(total_fp, 1),
        "scope3_share_pct": round(100 * total_s3 / total_fp, 1) if total_fp else 0,
        "cash_positive_abatement_tco2e": round(total_cp, 1),
        "cash_positive_abatement_pct": round(100 * total_cp / total_fp, 1) if total_fp else 0,
        "cash_positive_benefit_inr": round(total_benefit),
        "realisation": real,
        "by_sector": sorted(by_sector.values(), key=lambda x: -x["tco2e"]),
        "plants": plants,
    }
