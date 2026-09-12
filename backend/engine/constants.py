"""
PRANGARA Carbon Engine — Constants & Assumption Surface
Every statutory parameter, NCV, financial baseline, and physical threshold.
Preserves auditable provenance without hidden hardcoded magic numbers.
"""

from typing import Dict, Final

# -----------------------------------------------------------------------------
# Net Calorific Values (NCVs) in GJ per physical unit
# Sources: CEA Baseline v22, Ministry of Coal Gazette, DESNZ 2026 Table 1c
# -----------------------------------------------------------------------------
NCV_GJ_PER_UNIT: Final[Dict[str, float]] = {
    # Liquid fuels (GJ/litre or GJ/tonne)
    "diesel_litre": 0.0359,        # 35.9 MJ/litre
    "furnace_oil_litre": 0.0402,   # 40.2 MJ/litre
    "lpg_kg": 0.0461,              # 46.1 MJ/kg
    # Gaseous fuels (GJ/Sm3)
    "natural_gas_sm3": 0.0385,     # 38.5 MJ/Sm3 Gross basis
    # Solid Biomass (GJ/tonne)
    "biomass_briquettes_tonne": 16.50,  # 3,950 kcal/kg
    "rice_husk_tonne": 13.80,           # 3,300 kcal/kg
    "wood_chips_tonne": 14.50,          # 3,465 kcal/kg
    # Indian Non-Coking Coal Grades (GJ/tonne)
    "coal_g1": 29.50,
    "coal_g2": 28.00,
    "coal_g3": 26.50,
    "coal_g4": 25.00,
    "coal_g5": 23.50,
    "coal_g6": 22.00,
    "coal_g7": 20.50,
    "coal_g8": 19.00,
    "coal_g9": 17.50,
    "coal_g10": 16.00,
    "coal_g11": 14.50,
    "coal_g12": 13.00,
    "coal_g13": 11.50,
    "coal_g14": 10.00,
    "coal_g15": 8.50,
    "coal_g16": 7.00,
    "coal_g17": 5.50,
}

# Default industrial coal grade in Indian MSME clusters when grade is unspecified
DEFAULT_MSME_COAL_GRADE: Final[str] = "coal_g11"
DEFAULT_MSME_COAL_NCV_GJ_PER_T: Final[float] = NCV_GJ_PER_UNIT[DEFAULT_MSME_COAL_GRADE]  # 14.50 GJ/t

# Thermal process fuels subject to aggregate thermal SEC benchmarking
# Deliberately excludes diesel, which is used for backup DG electricity in Indian MSMEs
THERMAL_PROCESS_FUELS: Final[tuple] = (
    "coal_indian_msme", "coal_g11", "coal_g12", "coal_g13", "coal_g10",
    "furnace_oil", "natural_gas", "biomass_briquettes", "lpg", "rice_husk"
)

# -----------------------------------------------------------------------------
# Financial & Utility Baseline Parameters
# -----------------------------------------------------------------------------
DEFAULT_GRID_TARIFF_INR_PER_KWH: Final[float] = 8.00      # Indian industrial average HT tariff
DEFAULT_SOLAR_PPA_TARIFF_INR_PER_KWH: Final[float] = 4.20 # Commercial/Industrial captive solar PPA
DEFAULT_COST_OF_CAPITAL_WACC: Final[float] = 0.12        # 12.0% MSME term lending baseline in India
DEFAULT_ANALYSIS_HORIZON_YEARS: Final[int] = 10           # Standard 10-year project lifetime

# -----------------------------------------------------------------------------
# Carbon Compliance & Economic Reference Prices
# -----------------------------------------------------------------------------
CBAM_BENCHMARK_EUR_PER_TCO2E: Final[float] = 85.00        # Projected EU ETS allowance reference price
EUR_TO_INR_EXCHANGE_RATE: Final[float] = 90.00            # Central reference exchange rate
CBAM_BENCHMARK_INR_PER_TCO2E: Final[float] = CBAM_BENCHMARK_EUR_PER_TCO2E * EUR_TO_INR_EXCHANGE_RATE  # ₹7,650/tCO2e

CCTS_FLOOR_PRICE_INR_PER_CCC: Final[float] = 1200.00      # Indian Carbon Credit Certificate estimated floor price
CCTS_CEILING_PRICE_INR_PER_CCC: Final[float] = 3000.00    # Indian Carbon Credit Certificate ceiling price

# -----------------------------------------------------------------------------
# Mathematical Functions
# -----------------------------------------------------------------------------
def capital_recovery_factor(discount_rate: float, lifetime_years: int) -> float:
    """
    Computes Capital Recovery Factor: CRF = r * (1+r)^n / ((1+r)^n - 1)
    Annualizes upfront capital expenditure over the asset's economic lifetime.
    """
    if discount_rate <= 0 or lifetime_years <= 0:
        return 1.0 / max(1, lifetime_years)
    r = discount_rate
    n = lifetime_years
    factor = (1.0 + r) ** n
    return (r * factor) / (factor - 1.0)


def size_multiplier(revenue_crores: float) -> float:
    """
    Non-linear plant sizing factor for CAPEX scaling.
    A ₹100 Cr plant is not 10x the equipment cost of a ₹10 Cr plant (economies of scale).
    """
    if revenue_crores <= 5.0:
        return 0.75
    elif revenue_crores <= 25.0:
        return 1.00
    elif revenue_crores <= 100.0:
        return 1.65
    elif revenue_crores <= 500.0:
        return 2.50
    else:
        return 3.80
