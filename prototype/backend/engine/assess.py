"""
Orchestrator: profile in, full assessment out.

Assembles the baseline footprint, the leak-point findings, the costed
intervention portfolio, the Sankey flow view and the compliance exposure panel
into the single payload the UI and the PDF report both consume.
"""
from __future__ import annotations

from typing import Any

from .constants import (
    CBAM_REFERENCE_INR_PER_TCO2E, DEFAULT_DISCOUNT_RATE, DEFAULT_TARIFF_INR_PER_KWH,
)
from .factors import default_db
from .footprint import compute_footprint
from .leaks import detect_leaks, sector_db
from .macc import recommend

SCOPE_LABEL = {1: "Scope 1 - direct", 2: "Scope 2 - purchased energy", 3: "Scope 3 - value chain"}


def _sankey(fp_dict: dict[str, Any]) -> dict[str, Any]:
    """Three-level flow: stream -> scope -> total.

    A Sankey answers 'where does it come from and where does it pool' in one
    glance, which a pie chart cannot. It is the picture of a leak.
    """
    nodes: list[dict[str, Any]] = []
    index: dict[str, int] = {}

    def node(name: str, kind: str) -> int:
        if name not in index:
            index[name] = len(nodes)
            nodes.append({"name": name, "kind": kind})
        return index[name]

    links: list[dict[str, Any]] = []
    total_idx = node("Total footprint", "total")

    scope_totals: dict[int, float] = {}
    for s in fp_dict["streams"]:
        if s["tco2e"] <= 0:
            continue
        si = node(s["label"], "stream")
        sc = SCOPE_LABEL.get(s["scope"], f"Scope {s['scope']}")
        ci = node(sc, "scope")
        links.append({"source": si, "target": ci, "value": s["tco2e"], "scope": s["scope"]})
        scope_totals[s["scope"]] = scope_totals.get(s["scope"], 0.0) + s["tco2e"]

    for scope, val in sorted(scope_totals.items()):
        ci = node(SCOPE_LABEL.get(scope, f"Scope {scope}"), "scope")
        links.append({"source": ci, "target": total_idx, "value": round(val, 2), "scope": scope})

    return {"nodes": nodes, "links": links}


def _compliance(profile: dict[str, Any], fp_dict: dict[str, Any],
                sector: dict[str, Any]) -> dict[str, Any]:
    """Export and disclosure exposure.

    This is the panel that converts a sustainability nice-to-have into a
    commercial deadline. An Indian foundry exporting castings to the EU has a
    reporting obligation today, and mostly does not know it.
    """
    flags = sector.get("regulatory_flags", [])
    cbam_applicable = any("CBAM applicable" in f for f in flags)
    export_share = float(profile.get("eu_export_share_pct") or 0.0) / 100.0

    # CBAM covers embedded emissions of the covered good: direct process
    # emissions plus, for most goods, embedded electricity. Purchased material
    # upstream is treated through precursor rules and is deliberately EXCLUDED
    # here rather than guessed at.
    direct = fp_dict["scope1_tco2e"] + fp_dict["scope2_tco2e"]
    embedded_exported = direct * export_share

    cbam = {
        "applicable": cbam_applicable,
        "eu_export_share_pct": round(export_share * 100, 1),
        "embedded_emissions_exported_tco2e": round(embedded_exported, 1),
        "indicative_annual_cost_inr": round(embedded_exported * CBAM_REFERENCE_INR_PER_TCO2E),
        "reference_price_inr_per_tco2e": CBAM_REFERENCE_INR_PER_TCO2E,
        "basis": (
            "Scope 1 plus Scope 2 embedded emissions apportioned by EU export share. "
            "Precursor and upstream material emissions are excluded - CBAM precursor rules "
            "require supplier-specific data this tool does not hold, and estimating them "
            "would be a guess presented as a number."
        ),
        "caveat": (
            "Indicative exposure only. The CBAM definitive regime requires installation-level "
            "verified data and specific CN code mapping. Confirm your product CN codes and the "
            "current certificate price before acting on this figure."
        ),
    }

    total = fp_dict["total_tco2e"]
    brsr = {
        "relevant": True,
        "why": (
            "Listed Indian companies report under SEBI's BRSR, and BRSR Core extends assured "
            "disclosure into the value chain. Large customers are already cascading these data "
            "requests down to their SME suppliers, which is how this reaches an unlisted MSME."
        ),
        "readiness": [
            {"item": "Scope 1 inventory", "status": "ready" if fp_dict["scope1_tco2e"] > 0 else "no data",
             "value_tco2e": fp_dict["scope1_tco2e"]},
            {"item": "Scope 2 inventory (location-based)", "status": "ready" if fp_dict["scope2_tco2e"] > 0 else "no data",
             "value_tco2e": fp_dict["scope2_tco2e"]},
            {"item": "Scope 3 - purchased goods, waste, transport", "status": "partial",
             "value_tco2e": fp_dict["scope3_tco2e"],
             "note": "Covers the categories this assessment collected. Other Scope 3 categories are out of scope and are declared as such rather than reported as zero."},
            {"item": "Emission intensity per unit output", "status": "ready" if fp_dict["intensities"] else "no data"},
            {"item": "Third-party assurance", "status": "not started",
             "note": "Required for BRSR Core assured indicators. This tool produces audit-ready working papers, not assurance."},
        ],
        "total_disclosed_tco2e": total,
    }

    return {"cbam": cbam, "brsr": brsr, "sector_flags": flags}


def _headline(fp_dict: dict[str, Any], leaks: dict[str, Any], recs: dict[str, Any]) -> dict[str, Any]:
    """The three numbers that go on the first screen and in the pitch."""
    qw = recs["portfolio"]["quick_wins"]
    cp = recs["portfolio"]["cash_positive_only"]
    top_leak = leaks["leaks"][0] if leaks["leaks"] else None
    return {
        "total_tco2e": fp_dict["total_tco2e"],
        "total_range": fp_dict["total_range"],
        "uncertainty_pct": fp_dict["uncertainty_pct"],
        "top_leak": (top_leak["label"] if top_leak else None),
        "top_leak_share_pct": (top_leak["share_pct"] if top_leak else None),
        "top_leak_severity": (top_leak["severity"] if top_leak else None),
        "peer_percentile": (leaks["peer_position"]["percentile"] if leaks.get("peer_position") else None),
        "cash_positive_abatement_tco2e": cp["abatement_tco2e"],
        "cash_positive_abatement_pct": cp["abatement_pct"],
        "cash_positive_annual_benefit_inr": cp["net_annual_benefit_inr"],
        "cash_positive_capex_inr": cp["capex_inr"],
        "cash_positive_payback_months": cp["blended_payback_months"],
        "quick_win_count": qw["count"],
        "total_abatement_available_pct": recs["total_abatement_pct"],
        "statement": _statement(fp_dict, leaks, cp),
    }


def _statement(fp_dict: dict[str, Any], leaks: dict[str, Any], cp: dict[str, Any]) -> str:
    top = leaks["leaks"][0] if leaks["leaks"] else None
    opening = f"This plant emits about {fp_dict['total_tco2e']:,.0f} tCO2e a year"
    if fp_dict["scope3_tco2e"] > fp_dict["scope1_tco2e"] + fp_dict["scope2_tco2e"]:
        # Clause, not a sentence - joining this with a full stop produced
        # "a year. and 64 percent of it sits in Scope 3".
        opening += (
            f", and {fp_dict['scope_split_pct']['scope3']:.0f} percent of it sits in Scope 3, "
            "upstream of the factory gate"
        )
    parts = [opening]
    if top:
        parts.append(f"The largest single leak point is {top['label'].lower()} at {top['share_pct']:.0f} percent of the total")
    if cp["count"] > 0 and cp["net_annual_benefit_inr"] > 0:
        parts.append(
            f"{cp['count']} of the recommended interventions pay for themselves: "
            f"Rs {cp['net_annual_benefit_inr'] / 100000:,.1f} lakh a year of net benefit for "
            f"Rs {cp['capex_inr'] / 100000:,.1f} lakh of capital, removing "
            f"{cp['abatement_pct']:.0f} percent of the footprint"
        )
    return ". ".join(parts) + "."


def assess(profile: dict[str, Any],
           benchmarks: dict[str, Any] | None = None,
           benchmark_provenance: dict[str, Any] | None = None) -> dict[str, Any]:
    """Run the full assessment pipeline.

    Pass `benchmarks` to judge the plant against the live corpus instead of the
    literature priors. Everything else is unchanged, which keeps the anonymous
    sandbox and the signed-in product running the identical engine.
    """
    sector_key = profile.get("sector")
    if not sector_key:
        raise ValueError("profile.sector is required")
    sector = sector_db().get(sector_key)

    tariff = float(profile.get("tariff_inr_per_kwh") or DEFAULT_TARIFF_INR_PER_KWH)
    rate = float(profile.get("discount_rate") or DEFAULT_DISCOUNT_RATE)

    db = default_db()
    fp = compute_footprint(profile, db)
    fp_dict = fp.as_dict()
    leaks = detect_leaks(fp, sector_key, benchmarks, benchmark_provenance)
    recs = recommend(fp, sector_key, tariff=tariff, rate=rate, db=db)

    return {
        "profile": {
            "name": profile.get("name", "Unnamed plant"),
            "sector": sector_key,
            "sector_label": sector["label"],
            "state": profile.get("state"),
            "annual_output_t": profile.get("annual_output_t"),
            "annual_revenue_cr": profile.get("annual_revenue_cr"),
            "employees": profile.get("employees"),
        },
        "headline": _headline(fp_dict, leaks, recs),
        "footprint": fp_dict,
        "sankey": _sankey(fp_dict),
        "leaks": leaks,
        "recommendations": recs,
        "compliance": _compliance(profile, fp_dict, sector),
        "methodology": {
            "standard": "GHG Protocol Corporate Accounting and Reporting Standard",
            "gwp": db.meta.get("gwp_set"),
            "factor_note": db.meta.get("note"),
            "verification_status": db.meta.get("verification_status"),
            "benchmark_note": sector_db().meta.get("benchmark_note"),
            "leak_rule": sector_db().meta.get("leak_rule"),
        },
    }
