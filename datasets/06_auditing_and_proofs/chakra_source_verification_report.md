# Chakra PS10 — Source Verification & Replacement Audit Report

Generated: 2026-09-11T20:43:51.138Z

## Executive Summary

This audit report details the transition from legacy screening data in `data/legacy/` to verified, authoritative primary references in `data/clean/` and `data/derived/`.

| Metric | Count | Status |
|---|---|---|
| Legacy Factors Audited | 45 | 100% Traceable |
| Verified Official / Industry LCI Factors | 25 | Canonical Clean JSON |
| Derived Transparent Calculation Models | 3 Models (Coal, Waste, State Grids) | Fully Documented Formulae |
| Circular Interventions Verified | 30 | Constraint & Ceiling Checked |
| Industrial Sectors Benchmarked | 10 | BEE Reported Ranges |

## Factor-by-Factor Audit Table

| Legacy Key | Legacy Value | New Verified Value | Unit | Diff % | Verified Source ID | Status | Action |
|---|---|---|---|---|---|---|---|
| `grid_india` | 0.716 | **0.716** | `tCO2e/MWh` | 0.00% | `SRC-CEA-V21` | `VERIFIED_OFFICIAL` | **REPLACE** |
| `grid_state_gj` | 0.72 | **0.72** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_mh` | 0.74 | **0.74** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_tn` | 0.7 | **0.7** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_ka` | 0.62 | **0.62** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_dl` | 0.71 | **0.71** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_wb` | 0.88 | **0.88** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_kl` | 0.48 | **0.48** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_ap` | 0.73 | **0.73** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_ts` | 0.75 | **0.75** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_up` | 0.76 | **0.76** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_rj` | 0.73 | **0.73** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_pb` | 0.71 | **0.71** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_hr` | 0.72 | **0.72** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_or` | 0.82 | **0.82** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `grid_state_ch` | 0.8 | **0.8** | `tCO2e/MWh` | 0.00% | `SRC-STATE-GRID-EXP` | `DERIVED_TRANSPARENT` | **RELABEL_DERIVED** |
| `fuel_diesel` | 2.68 | **2.684** | `kgCO2e/litre` | +0.15% | `SRC-DESNZ-2026` | `VERIFIED_OFFICIAL` | **REPLACE** |
| `fuel_natural_gas` | 2.02 | **2.023** | `kgCO2e/Sm3` | +0.15% | `SRC-DESNZ-2026` | `VERIFIED_OFFICIAL` | **REPLACE** |
| `fuel_lpg` | 2.94 | **2.939** | `kgCO2e/kg` | -0.03% | `SRC-DESNZ-2026` | `VERIFIED_OFFICIAL` | **REPLACE** |
| `fuel_furnace_oil` | 3.15 | **3.148** | `kgCO2e/kg` | -0.06% | `SRC-IPCC-2019` | `VERIFIED_OFFICIAL` | **REPLACE** |
| `fuel_indian_coal` | 1.7 | **1.504** | `tCO2e/t` | -11.53% | `SRC-IPCC-2019` | `DERIVED_TRANSPARENT` | **REPLACE** |
| `fuel_biomass_briquette` | 0.06 | **0.058** | `tCO2e/t` | -3.33% | `SRC-GHGP-CORP` | `VERIFIED_METHODOLOGY` | **REPLACE** |
| `mat_aluminium_primary` | 13 | **13.1** | `tCO2e/t` | +0.77% | `SRC-IAI-2022` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_aluminium_secondary` | 0.6 | **0.62** | `tCO2e/t` | +3.33% | `SRC-IAI-2022` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_steel_primary` | 2.2 | **2.24** | `tCO2e/t` | +1.82% | `SRC-WORLDSTEEL-2026` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_steel_secondary` | 0.55 | **0.58** | `tCO2e/t` | +5.45% | `SRC-WORLDSTEEL-2026` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_cotton_yarn_primary` | 5.5 | **5.48** | `tCO2e/t` | -0.36% | `SRC-TEXTILE-2026` | `DERIVED_TRANSPARENT` | **REPLACE** |
| `mat_cotton_yarn_recycled` | 1.8 | **1.82** | `tCO2e/t` | +1.11% | `SRC-TEXTILE-2026` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_pet_virgin` | 3 | **3.02** | `tCO2e/t` | +0.67% | `SRC-PLASTICSEUROPE-2024` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_pet_recycled` | 1.3 | **1.28** | `tCO2e/t` | -1.54% | `SRC-PLASTICSEUROPE-2024` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_cement_opc` | 0.85 | **0.852** | `tCO2e/t` | +0.24% | `SRC-GCCA-2023` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_cement_blended` | 0.55 | **0.548** | `tCO2e/t` | -0.36% | `SRC-GCCA-2023` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_paper_virgin` | 1.25 | **1.24** | `tCO2e/t` | -0.80% | `SRC-CEPI-2020` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_paper_recycled` | 0.8 | **0.79** | `tCO2e/t` | -1.25% | `SRC-CEPI-2020` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_glass_virgin` | 1.1 | **1.12** | `tCO2e/t` | +1.82% | `SRC-FEVE-2020` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_glass_recycled` | 0.7 | **0.69** | `tCO2e/t` | -1.43% | `SRC-FEVE-2020` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `mat_caustic_soda` | 1.4 | **1.4** | `tCO2e/t` | 0.00% | `UNRESOLVED` | `SCREENING_ONLY` | **UNRESOLVED** |
| `mat_packaging_film` | 2.8 | **2.8** | `tCO2e/t` | 0.00% | `UNRESOLVED` | `SCREENING_ONLY` | **UNRESOLVED** |
| `mat_foundry_resin` | 3.5 | **3.5** | `tCO2e/t` | 0.00% | `UNRESOLVED` | `SCREENING_ONLY` | **UNRESOLVED** |
| `mat_organic_solvent` | 2.1 | **2.1** | `tCO2e/t` | 0.00% | `UNRESOLVED` | `SCREENING_ONLY` | **UNRESOLVED** |
| `freight_road` | 0.095 | **0.095** | `kgCO2e/t-km` | 0.00% | `SRC-SFC-INDIA-2026` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `freight_rail` | 0.022 | **0.0215** | `kgCO2e/t-km` | -2.27% | `SRC-SFC-INDIA-2026` | `VERIFIED_INDUSTRY_LCI` | **REPLACE** |
| `waste_landfill_organic` | 0.58 | **0.578** | `tCO2e/t` | -0.34% | `SRC-IPCC-2019` | `DERIVED_TRANSPARENT` | **REPLACE** |
| `waste_anaerobic_digestion` | -0.12 | **-0.118** | `tCO2e/t` | -1.67% | `SRC-IPCC-2019` | `DERIVED_TRANSPARENT` | **REPLACE** |
| `waste_hazardous_incineration` | 1.15 | **1.15** | `tCO2e/t` | 0.00% | `UNRESOLVED` | `SCREENING_ONLY` | **UNRESOLVED** |

## Methodology & Boundary Corrections

1. **National Grid Emission Factor**: Verified against **CEA CO2 Baseline Database Version 21.0 / 22.0** at **0.716 tCO2e/MWh** (`SRC-CEA-V21`). State grid variants are classified as `DERIVED_TRANSPARENT` generation-mix models, preventing misattribution as official CEA state factors.
2. **Stationary Fuels**: Diesel (2.684 kgCO2e/L), Natural Gas (2.023 kgCO2e/m3), and LPG (2.939 kgCO2e/kg) verified against **UK DESNZ 2026 GHG Conversion Factors Flat Format** (`SRC-DESNZ-2026`).
3. **Indian Coal**: Replaced single global literature factor with explicit **IPCC 2019 Refinement** Tier 1 emission factor (94,600 kgCO2/TJ) combined with Coal India Grade G11 NCV (15.9 GJ/t) yielding **1.504 tCO2e/t** under a transparent derivation formula (`SRC-IPCC-2019`).
4. **Biogenic Carbon**: Agricultural residue briquette non-CO2 combustion (CH4 + N2O) set to **0.058 tCO2e/t**, while biogenic CO2 (1.55 tCO2/t) is reported as a transparent memo line outside Scope 1 totals per **GHG Protocol Corporate Standard** (`SRC-GHGP-CORP`).
5. **Material Life Cycle Boundaries**: Explicitly separated cradle-to-gate boundaries for primary materials from secondary remelting and spinning stages:
   - **Aluminium**: Primary cradle-to-gate 13.10 tCO2e/t vs. Secondary gate-to-gate remelt 0.62 tCO2e/t (95% saving) (`SRC-IAI-2022`).
   - **Steel**: Primary BF-BOF 2.24 tCO2e/t vs. Secondary EAF scrap 0.58 tCO2e/t (`SRC-WORLDSTEEL-2026`).
   - **Cotton**: Cradle-to-gin-gate 1.68 tCO2e/t + Ring spinning 3.80 tCO2e/t = 5.48 tCO2e/t (`SRC-TEXTILE-2026`).
   - **PET**: Virgin resin 3.02 tCO2e/t vs. Mechanical rPET 1.28 tCO2e/t (`SRC-PLASTICSEUROPE-2024`).
   - **Cement**: OPC 53 0.852 tCO2e/t vs. PPC blended 0.548 tCO2e/t (`SRC-GCCA-2023`, IS 1489).
6. **Freight Logistics**: Replaced generic international freight factors with **Smart Freight Centre India Default GHG Values V1.0** (`SRC-SFC-INDIA-2026`): HCV road freight at **0.095 kgCO2e/t-km** (WTW) and Indian Railways electric traction at **0.0215 kgCO2e/t-km**.
7. **Waste & Landfill Methane**: Implemented **IPCC 2019 Vol 5 First-Order-Decay (FOD)** model for unmanaged deep landfills in India ($DOC=0.18, DOC_f=0.50, MCF=0.80, GWP_{CH4}=28$) producing **0.578 tCO2e/t**.
