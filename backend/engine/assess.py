"""
Orchestrator: profile in, full assessment out.

Assembles the baseline footprint, the leak-point findings, the costed
intervention portfolio, the Sankey flow view and the compliance exposure panel
into the single payload the UI and the PDF report both consume.
"""
from __future__ import annotations

from typing import Any

from .constants import (
    CBAM_ANNEX_1_COVERED_SECTORS, CBAM_EU_BENCHMARKS_TCO2E_PER_T,
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
                sector: dict[str, Any], recs: dict[str, Any] | None = None) -> dict[str, Any]:
    """Export and statutory disclosure exposure.

    Provides screening under EU CBAM (Regulation (EU) 2023/956), India BEE CCTS (2025/26), and SEBI BRSR Core.
    """
    flags = sector.get("regulatory_flags", [])
    sector_key = sector.get("key") or profile.get("sector", "")
    cbam_applicable = sector_key in CBAM_ANNEX_1_COVERED_SECTORS or any("CBAM applicable" in f for f in flags)
    export_share = float(profile.get("eu_export_share_pct") or 0.0) / 100.0
    out_t = float(profile.get("annual_output_t") or 0.0)

    # CBAM covers embedded emissions of covered goods (Iron/Steel, Aluminium, Cement, Fertilisers, Hydrogen).
    # Under EU CBAM Reg 2023/956 Art 31, certificates to surrender = max(0, Specific Embedded - EU Benchmark) * Export Tonnes.
    direct = fp_dict["scope1_tco2e"] + fp_dict["scope2_tco2e"]
    direct_intensity = (direct / out_t) if out_t > 0 else 0.0
    eu_benchmark = CBAM_EU_BENCHMARKS_TCO2E_PER_T.get(sector_key, 0.0)
    excess_intensity = max(0.0, direct_intensity - eu_benchmark)

    exported_tonnes = out_t * export_share if out_t > 0 else 0.0
    embedded_exported = direct * export_share
    net_surrender_tco2e = excess_intensity * exported_tonnes if (cbam_applicable and export_share > 0) else 0.0

    if cbam_applicable and export_share > 0:
        indicative_cost = round(net_surrender_tco2e * CBAM_REFERENCE_INR_PER_TCO2E)
        cbam_status = "covered_active"
        cbam_applicability = (
            f"CBAM Annex I covered sector. Specific direct intensity is {direct_intensity:.2f} tCO2e/t "
            f"vs EU ETS benchmark of {eu_benchmark:.2f} tCO2e/t."
        )
    elif export_share > 0:
        # Sector not covered under Phase 1 (definitive regime active 2026)
        indicative_cost = None
        cbam_status = "phase_2_watchlist"
        cbam_applicability = (
            f"Sector '{sector.get('label', sector_key)}' is exempt from CBAM Phase 1 (2026). "
            "Current statutory border liability is ₹0. Under active European Commission Article 30 review for post-2027 extension."
        )
    else:
        indicative_cost = None
        cbam_status = "not_applicable"
        cbam_applicability = "No EU export activity recorded."

    cbam = {
        "applicable": cbam_applicable and export_share > 0,
        "status": cbam_status,
        "applicability": cbam_applicability,
        "eu_export_share_pct": round(export_share * 100, 1),
        "embedded_emissions_exported_tco2e": round(embedded_exported, 1) if cbam_applicable else None,
        "eu_benchmark_tco2e_per_t": eu_benchmark if cbam_applicable else None,
        "excess_intensity_tco2e_per_t": round(excess_intensity, 2) if cbam_applicable else None,
        "net_surrender_tco2e": round(net_surrender_tco2e, 1) if cbam_applicable else None,
        "indicative_annual_cost_inr": indicative_cost,
        "reference_price_inr_per_tco2e": CBAM_REFERENCE_INR_PER_TCO2E if (cbam_applicable and export_share > 0) else None,
        "basis": (
            f"Statutory net surrender under EU Reg 2023/956 Art 31: max(0, Specific Intensity - {eu_benchmark:.2f} EU Benchmark) * EU Exported Output. "
            "Precursor emissions excluded pending supplier-specific declarations."
            if cbam_applicable else
            "Sector is outside EU CBAM Regulation (EU) 2023/956 Annex I scope in Phase 1 (2026 definitive regime)."
        ),
        "caveat": (
            "Indicative screening only. CBAM surrender liability requires installation-level verified "
            "data and customs CN code mapping. Final certificate price depends on weekly EU ETS auctions."
        ),
    }

    # India CCTS (Bureau of Energy Efficiency - Carbon Credit Trading Scheme)
    streams = fp_dict.get("streams", [])
    thermal_stream = next((s for s in streams if isinstance(s, dict) and s.get("key") == "thermal_fuel"), None) if isinstance(streams, list) else None
    thermal_gj = float(thermal_stream.get("activity_qty") or 0.0) if thermal_stream else 0.0
    if thermal_gj == 0.0 and out_t > 0:
        thermal_intensity = fp_dict.get("intensities", {}).get("thermal_gj_per_t", 0.0)
        thermal_gj = float(thermal_intensity or 0.0) * out_t

    is_ccts_obligated = thermal_gj >= 30000.0 or out_t >= 25000.0
    cash_positive = recs.get("portfolio", {}).get("cash_positive_only", {}) if recs else {}
    voluntary_ccc_tco2e = float(cash_positive.get("abatement_tco2e", 0.0))

    ccts = {
        "applicable": True,
        "status": "obligated" if is_ccts_obligated else "voluntary_eligible",
        "designated_consumer_status": (
            "Statutory Designated Consumer (Trajectory Targets Apply)"
            if is_ccts_obligated else
            "Voluntary Carbon Credit Eligible (Offset Mechanism)"
        ),
        "plant_thermal_gj": round(thermal_gj, 1),
        "designated_consumer_threshold_gj": 30000.0,
        "is_designated_consumer": is_ccts_obligated,
        "voluntary_ccc_potential_tco2e": round(voluntary_ccc_tco2e, 1),
        "mechanism": "Bureau of Energy Efficiency (BEE) / Carbon Credit Trading Scheme 2025-26",
        "notes": [
            "Mandatory compliance applies to notified Designated Consumers exceeding 30,000 GJ (~700 toe) thermal or high-volume thresholds.",
            f"Eligible for estimated {voluntary_ccc_tco2e:,.1f} tCO2e/yr in tradable Carbon Credit Certificates (CCCs) from recommended circular interventions.",
            "Statutory verification requires accredited Verification and Validation Body (VVB) audit under BEE rules.",
        ],
    }

    total = fp_dict["total_tco2e"]
    intensities = fp_dict.get("intensities", {})
    turnover_intensity = intensities.get("scope12_tco2e_per_cr_rev")

    brsr = {
        "relevant": True,
        "why": (
            "Listed Indian companies report under SEBI's BRSR, and BRSR Core extends assured "
            "disclosure into the value chain. Large customers require verified working papers from SME suppliers."
        ),
        "readiness": [
            {"item": "Scope 1 inventory", "status": "ready" if fp_dict["scope1_tco2e"] > 0 else "no data",
             "value_tco2e": fp_dict["scope1_tco2e"]},
            {"item": "Scope 2 inventory (location-based)", "status": "ready" if fp_dict["scope2_tco2e"] > 0 else "no data",
             "value_tco2e": fp_dict["scope2_tco2e"]},
            {"item": "Scope 3 - purchased goods, waste, transport", "status": "partial",
             "value_tco2e": fp_dict["scope3_tco2e"],
             "note": "Covers the categories this assessment collected. Other Scope 3 categories are declared as out-of-scope."},
            {"item": "Turnover GHG Intensity (Scope 1+2 per Cr)",
             "status": "ready" if turnover_intensity is not None else "no data",
             "value": round(turnover_intensity, 2) if turnover_intensity is not None else None,
             "unit": "tCO2e/INR Cr"},
            {"item": "Statutory Third-Party Assurance", "status": "not started",
             "note": "SEBI BRSR Core requires reasonable assurance on primary source documents. Working papers prepared; external assurance requires primary evidence in Evidence Vault."},
        ],
        "total_disclosed_tco2e": total,
    }

    return {"cbam": cbam, "ccts": ccts, "brsr": brsr, "sector_flags": flags}


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
        "compliance": _compliance(profile, fp_dict, sector, recs),
        "methodology": {
            "standard": "GHG Protocol Corporate Accounting and Reporting Standard",
            "gwp": db.meta.get("gwp_set"),
            "factor_note": db.meta.get("note"),
            "verification_status": db.meta.get("verification_status"),
            "benchmark_note": sector_db().meta.get("benchmark_note"),
            "leak_rule": sector_db().meta.get("leak_rule"),
        },
    }
