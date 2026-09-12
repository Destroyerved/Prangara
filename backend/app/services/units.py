"""
Unit normalisation.

Non-negotiable engine test, task.md section 15: *unknown units fail loudly*.
So there is no permissive fallback here. If a quantity arrives in a unit that
cannot be converted to the one the emission factor is defined in, this raises,
the request fails with a 422, and the user is told which record is wrong.

The alternative - assuming the number is probably in the right unit - produces a
footprint that is wrong by a factor of a thousand and looks entirely plausible.
"""
from __future__ import annotations

from app.core.errors import UnprocessableEntity

# Canonical spellings. Everything is compared lowercase with spaces stripped.
_ALIASES = {
    "kwh": "kWh", "kwh/yr": "kWh", "units": "kWh", "unit": "kWh", "kw-h": "kWh",
    "mwh": "MWh", "mwh/yr": "MWh",
    "gwh": "GWh",
    "t": "tonne", "te": "tonne", "ton": "tonne", "tons": "tonne", "tonne": "tonne",
    "tonnes": "tonne", "mt": "tonne", "metrictonne": "tonne",
    "kg": "kg", "kgs": "kg", "kilogram": "kg", "kilograms": "kg",
    "l": "litre", "lt": "litre", "ltr": "litre", "litre": "litre", "litres": "litre",
    "liter": "litre", "liters": "litre",
    "kl": "kilolitre", "kilolitre": "kilolitre",
    "sm3": "Sm3", "scm": "Sm3", "m3": "Sm3", "nm3": "Sm3",
    "tkm": "tonne-km", "tonnekm": "tonne-km", "tonne-km": "tonne-km",
    "tonnekilometre": "tonne-km", "t-km": "tonne-km", "tkm/yr": "tonne-km",
    "gj": "GJ",
}

# (from, to) -> multiplier. Only physically exact conversions live here.
_FACTORS: dict[tuple[str, str], float] = {
    ("MWh", "kWh"): 1000.0,
    ("GWh", "kWh"): 1_000_000.0,
    ("kWh", "MWh"): 0.001,
    ("kg", "tonne"): 0.001,
    ("tonne", "kg"): 1000.0,
    ("kilolitre", "litre"): 1000.0,
    ("litre", "kilolitre"): 0.001,
}


def canonical(unit: str | None) -> str:
    if not unit:
        return ""
    key = unit.strip().lower().replace(" ", "").replace("_", "")
    return _ALIASES.get(key, unit.strip())


def convert(quantity: float, from_unit: str, to_unit: str, *, context: str = "") -> float:
    """Convert, or raise 422 naming the record that could not be converted."""
    src, dst = canonical(from_unit), canonical(to_unit)
    if not dst:
        return quantity
    if not src:
        # An empty unit is not "probably correct" - it is missing data.
        raise UnprocessableEntity(
            f"No unit given{_where(context)}. Expected {dst}.", "missing_unit",
            {"expected_unit": dst, "context": context},
        )
    if src == dst:
        return quantity
    factor = _FACTORS.get((src, dst))
    if factor is None:
        raise UnprocessableEntity(
            f"Cannot convert {src} to {dst}{_where(context)}.", "unit_mismatch",
            {"from_unit": src, "to_unit": dst, "context": context},
        )
    return quantity * factor


def _where(context: str) -> str:
    return f" for {context}" if context else ""
