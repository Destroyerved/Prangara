# 04 — Derived Engineering & Mathematical Models

## Purpose & Use Case
Houses mathematically derived models where official government inputs are converted into carbon accounting factors using international statutory formulations.

## Included Models
1. **`chakra_coal_conversions_model.json` / `.csv`**:
   - Converts Ministry of Coal Grade G1 to G17 Gross Calorific Value (GCV) bands into Net Calorific Value (NCV) and specific CO2 emission factors ($tCO2e/t$) using IPCC 2006 Eq 1.4.
2. **`chakra_waste_landfill_methane_model.json` / `.csv`**:
   - Computes anaerobic degradation kinetics and methane generation from organic waste disposal using the IPCC 2019 Refinement Vol 5 First-Order-Decay (FOD) model ($DOC=0.18, DOC_f=0.50, F=0.50, MCF=0.80, GWP=28$).
3. **`chakra_state_grid_generation_mix.json` / `.csv`**:
   - Computes state-specific generation-mix carbon intensities for 15 Indian industrial states based on CEA monthly power generation statistics.
