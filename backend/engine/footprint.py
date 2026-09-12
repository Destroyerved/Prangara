"""
Baseline footprint: turns a plant profile into a scope-resolved, stream-resolved
carbon inventory following the GHG Protocol Corporate Standard.

The output is deliberately decomposed by *stream* rather than only by scope,
because a scope total tells an SME nothing actionable. "Scope 1 is 900 tonnes"
is not a finding. "Your coal boiler is 61 percent of your footprint" is.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .constants import NCV_GJ, THERMAL_FUELS
from .factors import Band, FactorDB, ZERO, default_db


@dataclass
class Stream:
    """One addressable source of emissions."""
    key: str
    label: str
    scope: int
    emissions: Band
    activity_qty: float
    activity_unit: str
    source: str
    # Which registry factors priced this stream. A list, not a single key,
    # because process heat is a fuel mix and freight is a modal mix - naming one
    # factor for a blended stream would be a false citation. PRD section 3.2.
    factor_keys: list[str] = field(default_factory=list)
    detail: dict[str, Any] = field(default_factory=dict)

    @property
    def t(self) -> float:
        return self.emissions.base

    def as_dict(self, total: float) -> dict[str, Any]:
        return {
            "key": self.key,
            "label": self.label,
            "scope": self.scope,
            "tco2e": round(self.emissions.base, 2),
            "range": self.emissions.as_dict(),
            "share_pct": round(100.0 * self.emissions.base / total, 1) if total > 0 else 0.0,
            "activity_qty": round(self.activity_qty, 2),
            "activity_unit": self.activity_unit,
            "source": self.source,
            "factor_keys": list(self.factor_keys),
            "detail": self.detail,
        }


@dataclass
class Footprint:
    streams: list[Stream]
    scope1: Band
    scope2: Band
    scope3: Band
    total: Band
    biogenic_co2_t: float
    intensities: dict[str, float]
    grid_source: str
    profile: dict[str, Any]

    def stream(self, key: str) -> Stream | None:
        for s in self.streams:
            if s.key == key:
                return s
        return None

    def as_dict(self) -> dict[str, Any]:
        tot = self.total.base
        ordered = sorted(self.streams, key=lambda s: -s.emissions.base)
        return {
            "total_tco2e": round(tot, 2),
            "total_range": self.total.as_dict(),
            "scope1_tco2e": round(self.scope1.base, 2),
            "scope2_tco2e": round(self.scope2.base, 2),
            "scope3_tco2e": round(self.scope3.base, 2),
            "scope_split_pct": {
                "scope1": round(100 * self.scope1.base / tot, 1) if tot else 0,
                "scope2": round(100 * self.scope2.base / tot, 1) if tot else 0,
                "scope3": round(100 * self.scope3.base / tot, 1) if tot else 0,
            },
            "biogenic_co2_t": round(self.biogenic_co2_t, 2),
            "intensities": {k: round(v, 3) for k, v in self.intensities.items()},
            "grid_source": self.grid_source,
            "streams": [s.as_dict(tot) for s in ordered],
            "uncertainty_pct": round(
                100.0 * (self.total.high - self.total.low) / (2 * tot), 1
            ) if tot else 0.0,
        }


def compute_footprint(profile: dict[str, Any], db: FactorDB | None = None) -> Footprint:
    """Build the baseline inventory from a plant profile."""
    db = db or default_db()
    streams: list[Stream] = []
    s1, s2, s3 = ZERO, ZERO, ZERO
    biogenic = 0.0

    # -- Scope 2: purchased electricity --------------------------------------
    kwh = float(profile.get("electricity_kwh") or 0.0)
    grid_band, grid_src = db.grid_factor(profile.get("state"))
    if kwh > 0:
        e = grid_band.scaled(kwh / 1000.0)
        s2 = s2 + e
        streams.append(Stream(
            key="electricity", label="Purchased electricity", scope=2, emissions=e,
            activity_qty=kwh, activity_unit="kWh/yr", source=grid_src,
            factor_keys=["IN_GRID_NATIONAL"],
            detail={"grid_factor_tco2e_per_mwh": round(grid_band.base, 3)},
        ))

    # -- Scope 1: combustion --------------------------------------------------
    # Thermal fuels are aggregated into a single addressable stream because the
    # abatement options (waste heat recovery, insulation, fuel switch) act on
    # process heat as a whole, not on one fuel at a time.
    fuels: dict[str, float] = profile.get("fuels") or {}
    thermal_band = ZERO
    thermal_gj = 0.0
    thermal_mix: dict[str, Any] = {}
    thermal_keys: list[str] = []

    for key, qty in fuels.items():
        qty = float(qty or 0.0)
        if qty <= 0 or not db.has(key):
            continue
        e = db.emissions(key, qty)
        gj = qty * NCV_GJ.get(key, 0.0)

        if key == "BIOMASS_BRIQUETTE":
            # Biogenic CO2 is disclosed separately and excluded from the Scope 1
            # total, per GHG Protocol. The factor already covers only CH4/N2O.
            # We estimate the biogenic CO2 for the memo line so the disclosure
            # is complete rather than silently omitted.
            biogenic += qty * 1.55

        if key in THERMAL_FUELS:
            thermal_band = thermal_band + e
            thermal_gj += gj
            thermal_keys.append(key)
            thermal_mix[db.label(key)] = {
                "qty": qty, "unit": db.denominator_unit(key),
                "tco2e": round(e.base, 2), "gj": round(gj, 1),
            }
        else:
            # Diesel and anything else stands alone.
            s1 = s1 + e
            streams.append(Stream(
                key="diesel" if key == "DIESEL" else f"fuel_{key}",
                label=db.label(key), scope=1, emissions=e,
                activity_qty=qty, activity_unit=db.denominator_unit(key),
                source=db.source(key), factor_keys=[key],
                detail={"gj": round(gj, 1)},
            ))

    if thermal_band.base > 0:
        s1 = s1 + thermal_band
        streams.append(Stream(
            key="thermal_fuel", label="Process heat (boiler / furnace fuel)", scope=1,
            emissions=thermal_band, activity_qty=thermal_gj, activity_unit="GJ/yr",
            source="IPCC / DEFRA combustion factors", factor_keys=thermal_keys,
            detail={"mix": thermal_mix, "total_gj": round(thermal_gj, 1)},
        ))

    # -- Scope 3: purchased materials ----------------------------------------
    for key, qty in (profile.get("materials") or {}).items():
        qty = float(qty or 0.0)
        if qty <= 0 or not db.has(key):
            continue
        e = db.emissions(key, qty)
        s3 = s3 + e
        streams.append(Stream(
            key=f"material_{key}", label=f"Purchased {db.label(key)}", scope=3, emissions=e,
            activity_qty=qty, activity_unit="tonne/yr", source=db.source(key),
            factor_keys=[key],
            detail={"material_key": key, "unit_price_inr": db.price(key)},
        ))

    # -- Scope 3: waste --------------------------------------------------------
    for key, qty in (profile.get("waste") or {}).items():
        qty = float(qty or 0.0)
        if qty <= 0 or not db.has(key):
            continue
        e = db.emissions(key, qty)
        s3 = s3 + e
        streams.append(Stream(
            key=f"waste_{key}", label=db.label(key), scope=3, emissions=e,
            activity_qty=qty, activity_unit="tonne/yr", source=db.source(key),
            factor_keys=[key],
            detail={"waste_key": key},
        ))

    # -- Scope 3: freight ------------------------------------------------------
    freight_band = ZERO
    freight_tkm = 0.0
    freight_mix: dict[str, Any] = {}
    freight_keys: list[str] = []
    for key, tkm in (profile.get("freight") or {}).items():
        tkm = float(tkm or 0.0)
        if tkm <= 0 or not db.has(key):
            continue
        e = db.emissions(key, tkm)
        freight_band = freight_band + e
        freight_tkm += tkm
        freight_keys.append(key)
        freight_mix[db.label(key)] = {"tonne_km": tkm, "tco2e": round(e.base, 2)}
    if freight_band.base > 0:
        s3 = s3 + freight_band
        streams.append(Stream(
            key="freight", label="Inbound and outbound freight", scope=3,
            emissions=freight_band, activity_qty=freight_tkm, activity_unit="tonne-km/yr",
            source="DEFRA modal freight factors", factor_keys=freight_keys,
            detail={"mix": freight_mix},
        ))

    total = s1 + s2 + s3

    # -- intensities ----------------------------------------------------------
    out_t = float(profile.get("annual_output_t") or 0.0)
    rev_cr = float(profile.get("annual_revenue_cr") or 0.0)
    intensities: dict[str, float] = {}
    # Gate-to-gate (Scope 1+2) intensity is what published sector energy
    # benchmarks actually measure, and it is the only part the plant directly
    # controls. Cradle-to-gate (including purchased materials) is reported
    # alongside it but is NOT benchmarked, because a plant that buys more
    # material per tonne of product is not thereby running a worse factory.
    # Mixing the two bases is the most common error in SME carbon tools.
    s12 = s1.base + s2.base
    if out_t > 0:
        intensities["scope12_tco2e_per_t"] = s12 / out_t
        intensities["total_tco2e_per_t"] = total.base / out_t
        intensities["electricity_kwh_per_t"] = kwh / out_t
        intensities["thermal_gj_per_t"] = thermal_gj / out_t
    if rev_cr > 0:
        intensities["scope12_tco2e_per_cr_rev"] = s12 / rev_cr
        intensities["total_tco2e_per_cr_rev"] = total.base / rev_cr
        intensities["electricity_kwh_per_lakh_rev"] = kwh / (rev_cr * 100.0)
        intensities["thermal_gj_per_lakh_rev"] = thermal_gj / (rev_cr * 100.0)

    return Footprint(
        streams=streams, scope1=s1, scope2=s2, scope3=s3, total=total,
        biogenic_co2_t=biogenic, intensities=intensities,
        grid_source=grid_src, profile=profile,
    )
