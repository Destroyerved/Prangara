# 01 — Statutory Emission Baselines & Regulatory Standards

## Purpose & Use Case
This folder contains the verified, statutory baseline emission factors and regulatory frameworks required for official carbon accounting, Scope 1 (fuel combustion), Scope 2 (grid electricity), and Scope 3 (value chain) compliance.

## Contents
1. **`chakra_emission_factors_verified.json`**:
   - **Indian National Grid**: 0.716 tCO2e/MWh (CEA CO2 Baseline Database v21/v22).
   - **Liquid & Gaseous Fuels**: Diesel (2.684 kgCO2e/L), Natural Gas (2.023 kgCO2e/Sm3), LPG (2.939 kgCO2e/kg) from UK DESNZ / DEFRA 2026.
   - **Industrial Materials**: Virgin vs Recycled Aluminium (IAI 2022), Steel BF-BOF vs EAF (worldsteel 2026), Cement OPC vs PPC (GCCA 2023 / BIS IS 1489), PET resin vs rPET (PlasticsEurope 2024), Container Glass (FEVE 2020).
   - **Logistics**: Road freight HCV (0.095 kgCO2e/t-km) & Rail freight (0.0215 kgCO2e/t-km) from Smart Freight Centre India.
2. **`chakra_environmental_regulations.json`**:
   - SEBI BRSR Core Value Chain framework (March 2025 circular).
   - European Union Carbon Border Adjustment Mechanism (EU CBAM) definitive regime rules.
   - CPCB Hazardous and Other Wastes Rules 2016 & Solid Waste Management Rules.
   - MoEFCC Fly Ash Utilisation Notification (mandatory 100% ash utilisation).
3. **`chakra_constants.json`**:
   - Statutory GWP constants (IPCC AR5: CO2=1, CH4=28, N2O=265), thermodynamic conversion constants, and grid parameters.
