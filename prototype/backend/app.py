"""
Chakra API.

Two surfaces, deliberately:

  * The ANONYMOUS SANDBOX (/api/assess, /api/demo) is stateless. Nothing is
    stored, nothing is required, and it is what the public demo hits. A plant
    can see its own footprint without creating an account or handing over data.

  * The SIGNED-IN PRODUCT (/api/plants/...) persists assessments, tracks
    implementation, and judges each plant against the live benchmark corpus
    rather than literature priors alone.

Both run the identical engine. The only difference is which benchmark set is
injected and whether the result is written down.
"""
from __future__ import annotations

import os
import sys
from typing import Any

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import auth  # noqa: E402
import benchmarks as bm  # noqa: E402
import db  # noqa: E402
import report as rpt  # noqa: E402
import repo  # noqa: E402
from engine import assess, default_db, intervention_db, sector_db  # noqa: E402

_HERE = os.path.dirname(os.path.abspath(__file__))
_FRONTEND = os.path.join(os.path.dirname(_HERE), "frontend")

app = FastAPI(title="Chakra",
              description="Industrial emission leak-point detection and circular recommendation",
              version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"], allow_credentials=True)


# ===========================================================================
# models
# ===========================================================================

class PlantProfile(BaseModel):
    name: str = "Unnamed plant"
    sector: str
    state: str | None = None
    annual_output_t: float = 0
    annual_revenue_cr: float = 0
    employees: int = 0
    electricity_kwh: float = 0
    fuels: dict[str, float] = Field(default_factory=dict)
    materials: dict[str, float] = Field(default_factory=dict)
    waste: dict[str, float] = Field(default_factory=dict)
    freight: dict[str, float] = Field(default_factory=dict)
    eu_export_share_pct: float = 0
    tariff_inr_per_kwh: float | None = None
    discount_rate: float | None = None


class RegisterIn(BaseModel):
    email: str
    password: str
    name: str = ""
    org_name: str = ""
    org_kind: str = "plant"


class LoginIn(BaseModel):
    email: str
    password: str


class PlantIn(BaseModel):
    name: str
    sector: str
    state: str | None = None


class AssessIn(BaseModel):
    profile: PlantProfile
    label: str | None = None


class ActionPatch(BaseModel):
    status: str | None = None
    act_abatement_tco2e: float | None = None
    act_capex_inr: float | None = None
    act_annual_benefit_inr: float | None = None
    target_date: str | None = None
    rejected_reason: str | None = None
    notes: str | None = None


# ===========================================================================
# reference / public
# ===========================================================================

@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "version": app.version,
            "sectors": len(sector_db().sectors),
            "interventions": len(intervention_db().items),
            "factors": len(default_db()._flat),
            "plants": (db.one("SELECT COUNT(*) c FROM plants WHERE archived_at IS NULL") or {}).get("c", 0),
            "assessments": (db.one("SELECT COUNT(*) c FROM assessments") or {}).get("c", 0)}


@app.get("/api/sectors")
def list_sectors() -> dict[str, Any]:
    return {"sectors": sector_db().list()}


@app.get("/api/sector/{key}")
def get_sector(key: str) -> dict[str, Any]:
    try:
        return {"key": key, **sector_db().get(key)}
    except KeyError:
        raise HTTPException(404, f"Unknown sector '{key}'")


@app.get("/api/reference")
def reference() -> dict[str, Any]:
    d = default_db()
    out: dict[str, Any] = {"meta": d.meta, "groups": {}}
    for group, entries in d.raw.items():
        if group == "meta":
            continue
        rows = []
        for k, spec in entries.items():
            if not isinstance(spec, dict) or "value" not in spec:
                continue
            rows.append({"key": k, "label": spec.get("label", k), "value": spec["value"],
                         "low": spec.get("low"), "high": spec.get("high"), "unit": spec["unit"],
                         "scope": spec.get("scope"), "source": spec.get("source"),
                         "note": spec.get("note"), "price_inr": spec.get("typical_price_inr")})
        out["groups"][group] = rows
    out["interventions_meta"] = intervention_db().meta
    out["intervention_count"] = len(intervention_db().items)
    return out


@app.post("/api/assess")
def sandbox_assess(profile: PlantProfile) -> Any:
    """Anonymous sandbox. Stateless - nothing is stored."""
    try:
        return JSONResponse(assess(profile.model_dump()))
    except (KeyError, ValueError) as ex:
        raise HTTPException(400, str(ex))


@app.get("/api/demo/{key}")
def demo(key: str) -> Any:
    try:
        sec = sector_db().get(key)
    except KeyError:
        raise HTTPException(404, f"Unknown sector '{key}'")
    prof = dict(sec["demo_profile"])
    prof["sector"] = key
    prof.setdefault("eu_export_share_pct", 25)
    return JSONResponse(assess(prof))


@app.get("/api/corpus")
def corpus() -> dict[str, Any]:
    """Flywheel health - how much of the benchmark is measured vs literature."""
    return bm.corpus_stats()


# ===========================================================================
# auth
# ===========================================================================

def _set_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(auth.COOKIE, token, httponly=True, samesite="lax",
                    max_age=auth.SESSION_DAYS * 86400, path="/")


@app.post("/api/auth/register")
def register(body: RegisterIn, response: Response) -> dict[str, Any]:
    res = auth.register(body.email, body.password, body.name, body.org_name, body.org_kind)
    token = auth.issue_session(res["user_id"])
    _set_cookie(response, token)
    return {"ok": True, **(auth.resolve(token) or {})}


@app.post("/api/auth/login")
def login(body: LoginIn, response: Response) -> dict[str, Any]:
    token = auth.login(body.email, body.password)
    _set_cookie(response, token)
    return {"ok": True, **(auth.resolve(token) or {})}


@app.post("/api/auth/logout")
def logout(response: Response,
           chakra_session: str | None = Cookie(default=None)) -> dict[str, Any]:
    auth.logout(chakra_session)
    response.delete_cookie(auth.COOKIE, path="/")
    return {"ok": True}


@app.get("/api/auth/me")
def me(user: dict[str, Any] | None = Depends(auth.optional_user)) -> dict[str, Any]:
    return {"authenticated": user is not None, "user": user}


# ===========================================================================
# plants
# ===========================================================================

@app.get("/api/plants")
def plants(user: dict = Depends(auth.current_user)) -> dict[str, Any]:
    return {"plants": repo.list_plants(user["org_id"])}


@app.post("/api/plants")
def create_plant(body: PlantIn, user: dict = Depends(auth.current_user)) -> dict[str, Any]:
    return repo.create_plant(user["org_id"], body.name, body.sector, body.state)


@app.get("/api/plants/{plant_id}")
def plant_detail(plant_id: str, user: dict = Depends(auth.current_user)) -> dict[str, Any]:
    p = repo.get_plant(user["org_id"], plant_id)
    return {"plant": p,
            "assessments": repo.list_assessments(user["org_id"], plant_id),
            "actions": repo.list_actions(user["org_id"], plant_id)}


@app.delete("/api/plants/{plant_id}")
def archive_plant(plant_id: str, user: dict = Depends(auth.current_user)) -> dict[str, Any]:
    repo.archive_plant(user["org_id"], plant_id)
    return {"ok": True}


@app.post("/api/plants/{plant_id}/assess")
def assess_plant(plant_id: str, body: AssessIn,
                 user: dict = Depends(auth.current_user)) -> Any:
    return JSONResponse(repo.run_assessment(
        user["org_id"], plant_id, body.profile.model_dump(), body.label))


@app.get("/api/assessments/{assessment_id}")
def assessment(assessment_id: str, user: dict = Depends(auth.current_user)) -> Any:
    return JSONResponse(repo.get_assessment(user["org_id"], assessment_id))


@app.get("/api/assessments/{assessment_id}/report")
def assessment_report(assessment_id: str, fmt: str = "pdf",
                      user: dict = Depends(auth.current_user)) -> Response:
    import datetime as dt
    row = db.one("SELECT a.created_at, p.name FROM assessments a JOIN plants p ON p.id=a.plant_id "
                 "WHERE a.id=?", (assessment_id,))
    result = repo.get_assessment(user["org_id"], assessment_id)
    when = dt.datetime.fromtimestamp(row["created_at"]).strftime("%d %B %Y")
    html_str = rpt.build_html(result, row["name"], when)

    if fmt == "html":
        return Response(html_str, media_type="text/html")
    pdf = rpt.to_pdf(html_str)
    if pdf is None:
        # No browser available to render. Hand back the HTML rather than failing.
        return Response(html_str, media_type="text/html",
                        headers={"X-Chakra-Note": "PDF renderer unavailable; returned HTML"})
    safe = "".join(c if c.isalnum() or c in "-_ " else "" for c in row["name"]).strip() or "report"
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="Chakra - {safe}.pdf"'})


# ===========================================================================
# actions / implementation tracking
# ===========================================================================

@app.patch("/api/plants/{plant_id}/actions/{intervention_id}")
def patch_action(plant_id: str, intervention_id: str, body: ActionPatch,
                 user: dict = Depends(auth.current_user)) -> dict[str, Any]:
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    return repo.update_action(user["org_id"], plant_id, intervention_id, patch)


# ===========================================================================
# portfolio
# ===========================================================================

@app.get("/api/portfolio")
def portfolio(user: dict = Depends(auth.current_user)) -> dict[str, Any]:
    return repo.portfolio(user["org_id"])


# ===========================================================================
# frontend
# ===========================================================================

if os.path.isdir(_FRONTEND):
    app.mount("/static", StaticFiles(directory=_FRONTEND), name="static")

    @app.get("/")
    def index() -> FileResponse:
        return FileResponse(os.path.join(_FRONTEND, "index.html"))
