"""
Emission factor loading, unit resolution and uncertainty-aware arithmetic.

Design note
-----------
Every factor in the database carries a low / base / high band. The engine
carries that band all the way through to the answer instead of collapsing it at
the first multiplication. A tool that prints "412 tCO2e" with no band is making
a claim it cannot support; a tool that prints "412 tCO2e (range 360-470)" is
making a claim an auditor can check.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")


@dataclass(frozen=True)
class Band:
    """A value with an uncertainty range. All arithmetic keeps the band."""
    base: float
    low: float
    high: float

    def __add__(self, other: "Band") -> "Band":
        return Band(self.base + other.base, self.low + other.low, self.high + other.high)

    def scaled(self, k: float) -> "Band":
        if k >= 0:
            return Band(self.base * k, self.low * k, self.high * k)
        # Negative multiplier flips which end of the band is the low end.
        return Band(self.base * k, self.high * k, self.low * k)

    def as_dict(self) -> dict[str, float]:
        return {"base": round(self.base, 3), "low": round(self.low, 3), "high": round(self.high, 3)}

    @staticmethod
    def zero() -> "Band":
        return Band(0.0, 0.0, 0.0)


ZERO = Band.zero()


class FactorDB:
    """Loads and resolves emission factors."""

    def __init__(self, path: str | None = None):
        path = path or os.path.join(_DATA_DIR, "emission_factors.json")
        with open(path, "r", encoding="utf-8") as fh:
            self.raw: dict[str, Any] = json.load(fh)
        self.meta = self.raw.get("meta", {})

        # Flatten every factor into one lookup so callers do not need to know
        # which category a key lives in.
        self._flat: dict[str, dict[str, Any]] = {}
        for group, entries in self.raw.items():
            if group == "meta":
                continue
            for key, spec in entries.items():
                if isinstance(spec, dict) and "value" in spec:
                    self._flat[key] = {**spec, "_group": group}

    # -- lookup -------------------------------------------------------------

    def get(self, key: str) -> dict[str, Any]:
        if key not in self._flat:
            raise KeyError(f"Unknown emission factor: {key}")
        return self._flat[key]

    def has(self, key: str) -> bool:
        return key in self._flat

    def band(self, key: str) -> Band:
        s = self.get(key)
        return Band(float(s["value"]), float(s.get("low", s["value"])), float(s.get("high", s["value"])))

    def label(self, key: str) -> str:
        return self.get(key).get("label", key)

    def source(self, key: str) -> str:
        return self.get(key).get("source", "unattributed")

    def price(self, key: str) -> float:
        return float(self.get(key).get("typical_price_inr", 0.0))

    def scope(self, key: str) -> int:
        return int(self.get(key).get("scope", 3))

    # -- grid ---------------------------------------------------------------

    def grid_factor(self, state: str | None) -> tuple[Band, str]:
        """Return the Scope 2 grid factor for a state, falling back to national.

        The state choice matters more than most people expect: West Bengal runs
        at roughly 1.8x Kerala per unit consumed. Getting this wrong is a larger
        error than almost anything else in the model.
        """
        national = self.raw["electricity"]["IN_GRID_NATIONAL"]
        states = self.raw["electricity"]["IN_GRID_STATE"]["states"]
        if state and state in states:
            v = float(states[state])
            # Carry the national relative band width onto the state point value.
            rel_low = float(national["low"]) / float(national["value"])
            rel_high = float(national["high"]) / float(national["value"])
            return Band(v, v * rel_low, v * rel_high), f"CEA regional grid mix - {state}"
        v = float(national["value"])
        return Band(v, float(national["low"]), float(national["high"])), "CEA national weighted average"

    # -- unit handling ------------------------------------------------------

    @staticmethod
    def _numerator_multiplier(unit: str) -> float:
        """Convert the factor's numerator to tonnes CO2e.

        Factors are published in mixed units - kgCO2e/litre, tCO2e/tonne,
        kgCO2e/tonne-km. Rather than silently assuming, we read the numerator
        off the unit string. If a new factor is added in an unrecognised unit
        the engine raises rather than quietly returning a wrong number.
        """
        u = unit.lower()
        if u.startswith("kgco2e"):
            return 0.001
        if u.startswith("tco2e"):
            return 1.0
        raise ValueError(f"Unrecognised emission factor numerator in unit '{unit}'")

    def emissions(self, key: str, quantity: float) -> Band:
        """tCO2e for a given activity quantity, in the factor's own denominator unit.

        Electricity is the one special case: the factor is per MWh but every
        Indian SME reads their bill in kWh, so the UI collects kWh and we
        convert here rather than asking the user to do arithmetic.
        """
        spec = self.get(key)
        mult = self._numerator_multiplier(spec["unit"])
        qty = float(quantity)
        if "/MWh" in spec["unit"]:
            qty = qty / 1000.0
        return self.band(key).scaled(qty * mult)

    def denominator_unit(self, key: str) -> str:
        """The unit the user must supply a quantity in, for UI labelling."""
        unit = self.get(key)["unit"]
        return unit.split("/", 1)[1] if "/" in unit else ""


_default_db: FactorDB | None = None


def default_db() -> FactorDB:
    global _default_db
    if _default_db is None:
        _default_db = FactorDB()
    return _default_db
