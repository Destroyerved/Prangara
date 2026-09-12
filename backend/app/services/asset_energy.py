"""
Deterministic energy estimate for a registered asset. PRD FR-06 and FR-07.

The point PRD FR-06 makes explicitly, and the one this module exists to enforce:
*a nameplate photograph does not reveal annual emissions*. It reveals rated
power. Annual consumption needs operating hours and load, and those come from
the user, not from a model.

So the estimate is a plain multiplication with every assumption named, the
confidence drops when an input is a default rather than a measurement, and if
there is no usable power figure there is no estimate at all - not a guess.

    kWh/yr = rated_kW / (efficiency) x load_factor x operating_hours
"""
from __future__ import annotations

from app.models.factory import Asset, Factory
from engine import default_db

# Screening defaults, used only when the user has not supplied the real value.
# Each one that is used drops the confidence of the result and is named in
# `estimate_basis`, so nothing silently rests on an assumption.
_DEFAULT_LOAD_FACTOR = 0.70
_DEFAULT_HOURS = {
    "motor": 6000.0, "compressor": 6000.0, "pump": 6000.0, "chiller": 4500.0,
    "hvac": 4500.0, "boiler": 6000.0, "furnace": 6000.0, "dg_set": 500.0,
    "cnc": 4000.0, "production_machine": 4000.0, "transformer": 8000.0,
}
_FALLBACK_HOURS = 4000.0


def estimate_asset(asset: Asset, factory: Factory) -> Asset:
    """Fill the estimate fields on an asset in place. Returns the same asset."""
    if not asset.rated_power_kw or asset.rated_power_kw <= 0:
        asset.estimated_annual_kwh = None
        asset.estimated_annual_tco2e = None
        asset.estimate_basis = (
            "No rated power recorded, so no energy estimate is possible. "
            "Add the nameplate kW rating to estimate this asset."
        )
        asset.confidence = "none"
        return asset

    assumptions: list[str] = []

    hours = asset.operating_hours_per_year
    if hours is None or hours <= 0:
        hours = _DEFAULT_HOURS.get(asset.asset_type, _FALLBACK_HOURS)
        assumptions.append(f"operating hours assumed at {hours:,.0f} h/yr for a {asset.asset_type}")

    load = asset.load_factor
    if load is None or load <= 0:
        load = _DEFAULT_LOAD_FACTOR
        assumptions.append(f"load factor assumed at {load:.0%}")

    # Nameplate efficiency describes the conversion inside the machine. Where it
    # is known, shaft-rated power understates electrical input, so we divide.
    efficiency = (asset.efficiency_pct / 100.0) if asset.efficiency_pct else None
    input_kw = asset.rated_power_kw / efficiency if efficiency else asset.rated_power_kw
    if efficiency is None:
        assumptions.append("nameplate efficiency not recorded, rated power treated as input power")

    kwh = input_kw * load * hours
    asset.estimated_annual_kwh = round(kwh, 1)

    # Carbon comes from the engine's factor registry, never from a local number.
    fdb = default_db()
    if asset.energy_type in (None, "", "electricity"):
        grid_band, grid_source = fdb.grid_factor(factory.state)
        asset.estimated_annual_tco2e = round(grid_band.base * (kwh / 1000.0), 3)
        factor_note = f"grid factor {grid_band.base:g} tCO2e/MWh ({grid_source})"
    elif asset.fuel_factor_key and fdb.has(asset.fuel_factor_key):
        # A fuel-fired asset's "kWh" is thermal output; converting that to fuel
        # quantity needs the plant's own boiler efficiency and fuel mix, which
        # this function does not have. Report energy only rather than guess.
        asset.estimated_annual_tco2e = None
        factor_note = (
            f"thermal asset on {fdb.label(asset.fuel_factor_key)}; fuel quantity and "
            "emissions come from the metered fuel purchase, not from the nameplate"
        )
    else:
        asset.estimated_annual_tco2e = None
        factor_note = "no emission factor selected for this energy type"

    asset.estimate_basis = (
        f"{input_kw:,.1f} kW x {load:.0%} load x {hours:,.0f} h/yr = "
        f"{kwh:,.0f} kWh/yr. {factor_note}."
        + (" Assumptions: " + "; ".join(assumptions) + "." if assumptions else "")
    )

    # Confidence is a function of how much the user actually told us.
    supplied = sum(1 for v in (asset.operating_hours_per_year, asset.load_factor,
                               asset.efficiency_pct) if v)
    asset.confidence = {3: "high", 2: "medium", 1: "low"}.get(supplied, "low")
    return asset
