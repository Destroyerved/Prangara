"""
PRANGARA Carbon Engine — Factors & Uncertainty Propagation
Standardizes factor resolution, units, geography, and uncertainty intervals [low, base, high].
Preserves mathematical monotonicity and raises loudly on invalid or unmapped units.
"""

from __future__ import annotations
import os
import json
from dataclasses import dataclass
from typing import Dict, Optional, Any, Union


@dataclass(frozen=True)
class Band:
    """
    Represents an empirical value with an explicit uncertainty band: [low, base, high].
    Arithmetic maintains low <= base <= high, properly inverting bounds on negative multipliers.
    """
    base: float
    low: float
    high: float

    def __post_init__(self):
        # Enforce invariant: low <= base <= high (with floating tolerance)
        l, b, h = float(self.low), float(self.base), float(self.high)
        if l > b + 1e-6 or b > h + 1e-6:
            raise ValueError(f"Band invariant violation: low ({l}) <= base ({b}) <= high ({h}) must hold")

    def __add__(self, other: Union[Band, float, int]) -> Band:
        if isinstance(other, Band):
            return Band(self.base + other.base, self.low + other.low, self.high + other.high)
        val = float(other)
        return Band(self.base + val, self.low + val, self.high + val)

    def __radd__(self, other: Union[Band, float, int]) -> Band:
        return self.__add__(other)

    def __sub__(self, other: Union[Band, float, int]) -> Band:
        if isinstance(other, Band):
            return Band(self.base - other.base, self.low - other.high, self.high - other.low)
        val = float(other)
        return Band(self.base - val, self.low - val, self.high - val)

    def __mul__(self, scalar: Union[float, int]) -> Band:
        k = float(scalar)
        if k >= 0:
            return Band(self.base * k, self.low * k, self.high * k)
        else:
            return Band(self.base * k, self.high * k, self.low * k)

    def __rmul__(self, scalar: Union[float, int]) -> Band:
        return self.__mul__(scalar)

    def __truediv__(self, scalar: Union[float, int]) -> Band:
        k = float(scalar)
        if k == 0:
            raise ZeroDivisionError("Cannot divide Band by zero scalar")
        return self.__mul__(1.0 / k)

    @property
    def uncertainty_pct(self) -> float:
        """Symmetric half-width percentage relative to base."""
        if self.base == 0:
            return 0.0
        delta = max(abs(self.high - self.base), abs(self.base - self.low))
        return round((delta / self.base) * 100.0, 1)

    def to_dict(self) -> Dict[str, float]:
        return {
            "base": round(self.base, 4),
            "low": round(self.low, 4),
            "high": round(self.high, 4),
            "uncertainty_pct": self.uncertainty_pct
        }


class FactorDB:
    """
    Lookup engine for sovereign emission factors.
    Loads from canonical verified datasets in datasets/01_statutory_emission_baselines/
    and datasets/05_database_and_typed_layer/json/.
    """
    _instance: Optional[FactorDB] = None

    def __init__(self, dataset_path: Optional[str] = None):
        self.factors: Dict[str, Dict[str, Any]] = {}
        self.state_grids: Dict[str, Dict[str, Any]] = {}
        self._load_factors(dataset_path)

    @classmethod
    def get_instance(cls, dataset_path: Optional[str] = None) -> FactorDB:
        if cls._instance is None:
            cls._instance = FactorDB(dataset_path)
        return cls._instance

    def _load_factors(self, dataset_path: Optional[str]):
        # Locate project root
        base_dir = dataset_path or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        factors_file = os.path.join(base_dir, "datasets", "data", "clean", "emission_factors_verified.json")
        
        # Fallback to 01_statutory_emission_baselines if clean not present
        if not os.path.exists(factors_file):
            factors_file = os.path.join(base_dir, "datasets", "01_statutory_emission_baselines", "chakra_emission_factors.json")

        if os.path.exists(factors_file):
            with open(factors_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.factors = data.get("factors", {})
                self.state_grids = data.get("state_grid_variants", {})
        else:
            # Fallback embedded sovereign defaults (CEA v22 / DESNZ 2026)
            self._init_embedded_defaults()

    def _init_embedded_defaults(self):
        """Standard fallback factors if json files are being loaded dynamically."""
        self.factors = {
            "grid_electricity_in": {
                "key": "grid_electricity_in",
                "value": 0.716, "low": 0.680, "high": 0.752,
                "unit": "tCO2e/MWh", "scope": 2, "source_id": "SRC-CEA-V22"
            },
            "diesel_combustion": {
                "key": "diesel_combustion",
                "value": 2.684, "low": 2.610, "high": 2.760,
                "unit": "kgCO2e/litre", "scope": 1, "source_id": "SRC-DESNZ-2026"
            },
            "natural_gas_combustion": {
                "key": "natural_gas_combustion",
                "value": 2.023, "low": 1.960, "high": 2.080,
                "unit": "kgCO2e/Sm3", "scope": 1, "source_id": "SRC-DESNZ-2026"
            },
            "coal_indian_msme": {
                "key": "coal_indian_msme",
                "value": 1.395, "low": 1.250, "high": 1.540,
                "unit": "tCO2/t", "scope": 1, "source_id": "SRC-IPCC-2019"
            },
            "furnace_oil_combustion": {
                "key": "furnace_oil_combustion",
                "value": 3.176, "low": 3.080, "high": 3.270,
                "unit": "kgCO2e/litre", "scope": 1, "source_id": "SRC-DESNZ-2026"
            },
            "lpg_combustion": {
                "key": "lpg_combustion",
                "value": 2.939, "low": 2.850, "high": 3.030,
                "unit": "kgCO2e/kg", "scope": 1, "source_id": "SRC-DESNZ-2026"
            },
            "cotton_raw_gin": {
                "key": "cotton_raw_gin",
                "value": 2.200, "low": 1.800, "high": 2.650,
                "unit": "kgCO2e/kg", "scope": 3, "source_id": "SRC-TEXTILE-EXCHANGE-2026"
            },
            "steel_bf_bof_virgin": {
                "key": "steel_bf_bof_virgin",
                "value": 2.320, "low": 2.100, "high": 2.550,
                "unit": "kgCO2e/kg", "scope": 3, "source_id": "SRC-WORLDSTEEL-2025"
            },
            "pet_virgin_granules": {
                "key": "pet_virgin_granules",
                "value": 2.150, "low": 1.950, "high": 2.350,
                "unit": "kgCO2e/kg", "scope": 3, "source_id": "SRC-PLASTICSEUROPE-2024"
            },
            "aluminium_ingot_primary": {
                "key": "aluminium_ingot_primary",
                "value": 8.900, "low": 8.200, "high": 9.600,
                "unit": "kgCO2e/kg", "scope": 3, "source_id": "SRC-IAI-2025"
            },
            "freight_road_heavy_rigid": {
                "key": "freight_road_heavy_rigid",
                "value": 0.089, "low": 0.075, "high": 0.105,
                "unit": "kgCO2e/t-km", "scope": 3, "source_id": "SRC-SFC-INDIA-2024"
            }
        }
        self.state_grids = {
            "TN": {"name": "Tamil Nadu", "derived_value": 0.625, "status": "RE_HEAVY"},
            "GJ": {"name": "Gujarat", "derived_value": 0.742, "status": "COAL_GAS_BALANCED"},
            "MH": {"name": "Maharashtra", "derived_value": 0.785, "status": "COAL_HEAVY"},
            "KA": {"name": "Karnataka", "derived_value": 0.580, "status": "RE_VERY_HIGH"},
            "OR": {"name": "Odisha", "derived_value": 0.940, "status": "COAL_DOMINANT"},
            "WB": {"name": "West Bengal", "derived_value": 0.915, "status": "COAL_DOMINANT"},
            "PB": {"name": "Punjab", "derived_value": 0.710, "status": "MIXED_GRID"}
        }

    def get_factor(self, key: str) -> Dict[str, Any]:
        if key not in self.factors:
            raise KeyError(f"Emission factor '{key}' is not recognized in statutory registry.")
        return self.factors[key]

    def get_band(self, key: str) -> Band:
        f = self.get_factor(key)
        return Band(base=f["value"], low=f.get("low", f["value"]), high=f.get("high", f["value"]))

    def resolve_grid_factor(self, state_code: Optional[str]) -> Band:
        """
        Returns grid electricity emission factor (tCO2e/MWh).
        If an Indian state code is supplied (e.g. 'TN', 'GJ'), maps to regional grid intensity,
        carrying national uncertainty margins.
        """
        national_band = self.get_band("grid_electricity_in")
        if not state_code:
            return national_band
        st = state_code.upper().strip()
        if st in self.state_grids:
            state_val = self.state_grids[st]["derived_value"]
            # Scale low and high proportionally
            ratio = state_val / national_band.base
            return Band(base=state_val, low=national_band.low * ratio, high=national_band.high * ratio)
        return national_band

    def convert_to_tco2e(self, factor_key: str, quantity: float, state_code: Optional[str] = None) -> Band:
        """
        Converts physical activity quantity into metric tonnes of CO2e (tCO2e) with Band.
        Handles kgCO2e -> tCO2e (divide by 1000) and tCO2e/MWh -> tCO2e natively.
        """
        if factor_key == "grid_electricity_in":
            # Quantity in MWh (or converted from kWh / 1000)
            band = self.resolve_grid_factor(state_code)
            return band * quantity

        f = self.get_factor(factor_key)
        unit = f.get("unit", "")
        band = self.get_band(factor_key)

        if unit.startswith("kgCO2") or unit.startswith("kgCO2e"):
            # Result in tonnes: (kgCO2e * quantity) / 1000.0
            return (band * quantity) / 1000.0
        elif unit.startswith("tCO2") or unit.startswith("tCO2e"):
            return band * quantity
        else:
            raise ValueError(f"Unrecognized canonical emission factor unit: '{unit}' for factor '{factor_key}'")
