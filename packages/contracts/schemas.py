"""
PRANGARA Shared Pydantic DTOs for Python backends (FastAPI)
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class UncertaintyBand(BaseModel):
    low: float
    base: float
    high: float
    unit: str = "tCO2e"

class FuelEntry(BaseModel):
    fuel_key: str
    annual_quantity: float
    unit: str

class MaterialEntry(BaseModel):
    material_key: str
    annual_tonnes: float

class PlantProfile(BaseModel):
    company_name: str
    plant_name: str
    sector_key: str
    state: str
    annual_production_tonnes: float
    production_unit: Optional[str] = "tonnes"
    annual_turnover_inr_cr: Optional[float] = None
    operating_hours_per_year: Optional[float] = None
    electricity_kwh: Optional[float] = None
    fossil_fuels: Optional[List[FuelEntry]] = []
    raw_materials: Optional[List[MaterialEntry]] = []

class OptimizationConstraints(BaseModel):
    max_capex_inr: Optional[float] = None
    max_payback_months: Optional[float] = None
    target_abatement_pct: Optional[float] = None

class AssessmentRequest(BaseModel):
    plant_profile: PlantProfile
    constraints: Optional[OptimizationConstraints] = None
