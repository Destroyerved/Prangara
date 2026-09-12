"""
Provider matching and quote comparison. PRD FR-36 and FR-38.

Rule-based, weighted, and explained. PRD FR-36 says no ML is needed in V1, and
a weighted score a factory owner can read beats a model they cannot question.
Every match returns the reasons that produced its score.

Quote comparison reruns the engine's own economics with the quoted price in
place of the library's planning-grade capex estimate. That is the number the
factory actually decides on, and it is computed by the engine, not here.
"""
from __future__ import annotations

import math
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.factory import Factory
from app.models.marketplace import Provider, ProviderService
from engine.constants import DEFAULT_DISCOUNT_RATE, capital_recovery_factor

# Weights sum to 1.0. Kept visible so they can be argued with.
_WEIGHTS = {
    "capability": 0.40,   # does this provider actually do this intervention
    "proximity": 0.25,    # travel cost and response time are real
    "verification": 0.15,
    "rating": 0.10,
    "availability": 0.10,
}

_EARTH_KM = 6371.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * _EARTH_KM * math.asin(math.sqrt(a))


def match_providers(db: Session, factory: Factory, intervention_id: str,
                    limit: int = 10) -> list[dict[str, Any]]:
    providers = db.scalars(
        select(Provider).where(Provider.archived_at.is_(None))
    ).all()
    services_by_provider: dict[str, list[ProviderService]] = {}
    for service in db.scalars(
        select(ProviderService).where(ProviderService.is_active.is_(True))
    ).all():
        services_by_provider.setdefault(service.provider_id, []).append(service)

    matches: list[dict[str, Any]] = []
    for provider in providers:
        services = services_by_provider.get(provider.id, [])
        matched = next(
            (s for s in services if intervention_id in (s.intervention_ids or [])), None
        )
        reasons: list[str] = []

        if matched is not None:
            capability = 1.0
            reasons.append(f"Lists this intervention directly under '{matched.name}'.")
        elif services:
            capability = 0.35
            reasons.append(
                "Works in a related category but does not list this specific intervention."
            )
        else:
            # A provider with no declared services is not a match, it is a
            # directory entry. Skip rather than rank it.
            continue

        distance = None
        if all(v is not None for v in (factory.latitude, factory.longitude,
                                       provider.latitude, provider.longitude)):
            distance = haversine_km(
                factory.latitude, factory.longitude, provider.latitude, provider.longitude
            )
            radius = provider.service_radius_km or 250.0
            proximity = max(0.0, 1.0 - distance / max(radius, 1.0))
            reasons.append(f"About {distance:,.0f} km away.")
        elif factory.state and factory.state in (provider.service_states or []):
            proximity = 0.8
            reasons.append(f"Covers {factory.state}.")
        elif factory.state and provider.state == factory.state:
            proximity = 0.7
            reasons.append(f"Based in {factory.state}.")
        else:
            proximity = 0.3
            reasons.append("Service area for this location is not stated.")

        verification = {"verified": 1.0, "pending": 0.5}.get(provider.verification_status, 0.2)
        if provider.verification_status == "verified":
            reasons.append("Verified on the platform.")
        else:
            reasons.append("Not yet verified - check credentials before committing.")

        rating = (provider.rating / 5.0) if provider.rating else 0.5
        if provider.rating:
            reasons.append(f"Rated {provider.rating:.1f} from {provider.rating_count} job(s).")

        availability = 1.0 if provider.accepting_work else 0.0
        if not provider.accepting_work:
            reasons.append("Currently not accepting new work.")

        score = (
            _WEIGHTS["capability"] * capability
            + _WEIGHTS["proximity"] * proximity
            + _WEIGHTS["verification"] * verification
            + _WEIGHTS["rating"] * rating
            + _WEIGHTS["availability"] * availability
        )
        matches.append({
            "provider": provider,
            "score": round(score, 3),
            "reasons": reasons,
            "distance_km": round(distance, 1) if distance is not None else None,
            "indicative_price_inr": matched.indicative_price_inr if matched else None,
            "matched_service_id": matched.id if matched else None,
        })

    matches.sort(key=lambda m: -m["score"])
    return matches[:limit]


def recompute_economics(engine_snapshot: dict[str, Any], quoted_capex: float,
                        opex_delta: float | None, discount_rate: float | None) -> dict[str, Any]:
    """Redo payback / LCOA / NPV with a real quoted price. PRD FR-38.

    The formulas are the engine's (`engine.macc`), reused with one input
    swapped. Nothing new is invented: the quote replaces the capex estimate and
    everything downstream follows.
    """
    abatement = float(engine_snapshot.get("expected_abatement_tco2e") or 0.0)
    benefit = float(engine_snapshot.get("expected_annual_benefit_inr") or 0.0)
    lifetime = int(engine_snapshot.get("lifetime_yrs") or 10)
    rate = discount_rate if discount_rate is not None else DEFAULT_DISCOUNT_RATE

    if opex_delta is not None:
        benefit = benefit - opex_delta

    crf = capital_recovery_factor(rate, lifetime)
    lcoa = ((crf * quoted_capex) - benefit) / abatement if abatement > 0 else None
    payback = (quoted_capex / benefit) if benefit > 0 and quoted_capex > 0 else (
        0.0 if quoted_capex <= 0 and benefit > 0 else None
    )
    npv = -quoted_capex + sum(benefit / ((1 + rate) ** year) for year in range(1, lifetime + 1))

    estimated_capex = float(engine_snapshot.get("expected_capex_inr") or 0.0)
    return {
        "quoted_capex_inr": round(quoted_capex),
        "estimated_capex_inr": round(estimated_capex),
        "capex_delta_pct": round(100 * (quoted_capex - estimated_capex) / estimated_capex, 1)
        if estimated_capex > 0 else None,
        "net_annual_benefit_inr": round(benefit),
        "payback_yrs": round(payback, 2) if payback is not None else None,
        "payback_months": round(payback * 12) if payback is not None else None,
        "lcoa_inr_per_tco2e": round(lcoa) if lcoa is not None else None,
        "npv_inr": round(npv),
        "cash_positive": bool(lcoa is not None and lcoa < 0),
        "discount_rate": rate,
        "lifetime_yrs": lifetime,
        "basis": (
            "Recomputed with the quoted price in place of the planning-grade capex estimate, "
            "using the same capital recovery factor, LCOA and NPV formulas as the assessment."
        ),
    }
