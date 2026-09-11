const fs = require('fs');
const path = require('path');

const legacyDir = path.join(__dirname, '../../data/legacy');
if (!fs.existsSync(legacyDir)) {
  fs.mkdirSync(legacyDir, { recursive: true });
}

// 1. emission_factors.json (31 factors + 15 state grids)
const emissionFactors = {
  metadata: {
    description: "Legacy Chakra Reference Emission Factors as described in ChakraReport.pdf",
    version: "1.0-legacy",
    source_type: "literature_screening"
  },
  factors: {
    grid_india: {
      value: 0.716,
      low: 0.680,
      high: 0.760,
      unit: "tCO2e/MWh",
      scope: 2,
      group: "electricity",
      source: "CEA CO2 Baseline Database (unverified vintage)",
      notes: "National average operating margin/weighted grid factor"
    },
    // 15 State Grid Variants
    grid_state_gj: { value: 0.720, low: 0.690, high: 0.750, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Gujarat" },
    grid_state_mh: { value: 0.740, low: 0.700, high: 0.780, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Maharashtra" },
    grid_state_tn: { value: 0.700, low: 0.660, high: 0.740, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Tamil Nadu" },
    grid_state_ka: { value: 0.620, low: 0.580, high: 0.660, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Karnataka" },
    grid_state_dl: { value: 0.710, low: 0.670, high: 0.750, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Delhi" },
    grid_state_wb: { value: 0.880, low: 0.840, high: 0.920, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "West Bengal" },
    grid_state_kl: { value: 0.480, low: 0.440, high: 0.520, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Kerala" },
    grid_state_ap: { value: 0.730, low: 0.690, high: 0.770, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Andhra Pradesh" },
    grid_state_ts: { value: 0.750, low: 0.710, high: 0.790, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Telangana" },
    grid_state_up: { value: 0.760, low: 0.720, high: 0.800, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Uttar Pradesh" },
    grid_state_rj: { value: 0.730, low: 0.690, high: 0.770, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Rajasthan" },
    grid_state_pb: { value: 0.710, low: 0.670, high: 0.750, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Punjab" },
    grid_state_hr: { value: 0.720, low: 0.680, high: 0.760, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Haryana" },
    grid_state_or: { value: 0.820, low: 0.780, high: 0.860, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Odisha" },
    grid_state_ch: { value: 0.800, low: 0.760, high: 0.840, unit: "tCO2e/MWh", scope: 2, group: "electricity", source: "Derived from CEA regional mixes", state: "Chhattisgarh" },
    
    // Fuels
    fuel_diesel: { value: 2.68, low: 2.60, high: 2.75, unit: "kgCO2e/litre", scope: 1, group: "fuels", source: "DEFRA stationary combustion" },
    fuel_natural_gas: { value: 2.02, low: 1.92, high: 2.12, unit: "kgCO2e/Sm3", scope: 1, group: "fuels", source: "DEFRA gross CV" },
    fuel_lpg: { value: 2.94, low: 2.88, high: 3.00, unit: "kgCO2e/kg", scope: 1, group: "fuels", source: "DEFRA" },
    fuel_furnace_oil: { value: 3.15, low: 3.05, high: 3.25, unit: "kgCO2e/kg", scope: 1, group: "fuels", source: "IPCC 2006 Vol.2 residual fuel oil" },
    fuel_indian_coal: { value: 1.70, low: 1.45, high: 2.00, unit: "tCO2e/t", scope: 1, group: "fuels", source: "IPCC adjusted for Indian ash/NCV" },
    fuel_biomass_briquette: { value: 0.06, low: 0.02, high: 0.12, unit: "tCO2e/t", scope: 1, group: "fuels", source: "CH4/N2O only (GHG Protocol biogenic exclusion)" },

    // Materials
    mat_aluminium_primary: { value: 13.0, low: 12.0, high: 14.0, unit: "tCO2e/t", scope: 3, group: "materials", source: "IAI generic / literature" },
    mat_aluminium_secondary: { value: 0.60, low: 0.50, high: 0.70, unit: "tCO2e/t", scope: 3, group: "materials", source: "IAI generic / literature" },
    mat_steel_primary: { value: 2.20, low: 1.90, high: 2.50, unit: "tCO2e/t", scope: 3, group: "materials", source: "worldsteel generic / literature" },
    mat_steel_secondary: { value: 0.55, low: 0.45, high: 0.65, unit: "tCO2e/t", scope: 3, group: "materials", source: "worldsteel generic / literature" },
    mat_cotton_yarn_primary: { value: 5.50, low: 4.80, high: 6.20, unit: "tCO2e/t", scope: 3, group: "materials", source: "literature screening" },
    mat_cotton_yarn_recycled: { value: 1.80, low: 1.40, high: 2.20, unit: "tCO2e/t", scope: 3, group: "materials", source: "literature screening" },
    mat_pet_virgin: { value: 3.00, low: 2.70, high: 3.30, unit: "tCO2e/t", scope: 3, group: "materials", source: "PlasticsEurope / literature" },
    mat_pet_recycled: { value: 1.30, low: 1.10, high: 1.50, unit: "tCO2e/t", scope: 3, group: "materials", source: "literature screening" },
    mat_cement_opc: { value: 0.85, low: 0.80, high: 0.92, unit: "tCO2e/t", scope: 3, group: "materials", source: "GCCA / literature" },
    mat_cement_blended: { value: 0.55, low: 0.50, high: 0.62, unit: "tCO2e/t", scope: 3, group: "materials", source: "GCCA / literature" },
    mat_paper_virgin: { value: 1.25, low: 1.10, high: 1.40, unit: "tCO2e/t", scope: 3, group: "materials", source: "CEPI / literature" },
    mat_paper_recycled: { value: 0.80, low: 0.70, high: 0.90, unit: "tCO2e/t", scope: 3, group: "materials", source: "CEPI / literature" },
    mat_glass_virgin: { value: 1.10, low: 1.00, high: 1.20, unit: "tCO2e/t", scope: 3, group: "materials", source: "FEVE / literature" },
    mat_glass_recycled: { value: 0.70, low: 0.60, high: 0.80, unit: "tCO2e/t", scope: 3, group: "materials", source: "FEVE / literature" },
    mat_caustic_soda: { value: 1.40, low: 1.25, high: 1.55, unit: "tCO2e/t", scope: 3, group: "materials", source: "literature" },
    mat_packaging_film: { value: 2.80, low: 2.50, high: 3.10, unit: "tCO2e/t", scope: 3, group: "materials", source: "literature" },
    mat_foundry_resin: { value: 3.50, low: 3.10, high: 3.90, unit: "tCO2e/t", scope: 3, group: "materials", source: "literature" },
    mat_organic_solvent: { value: 2.10, low: 1.85, high: 2.35, unit: "tCO2e/t", scope: 3, group: "materials", source: "literature" },

    // Transport
    freight_road: { value: 0.095, low: 0.085, high: 0.110, unit: "kgCO2e/t-km", scope: 3, group: "logistics", source: "DEFRA road freight average" },
    freight_rail: { value: 0.022, low: 0.018, high: 0.028, unit: "kgCO2e/t-km", scope: 3, group: "logistics", source: "Indian Railways / literature" },

    // Waste
    waste_landfill_organic: { value: 0.58, low: 0.45, high: 0.72, unit: "tCO2e/t", scope: 3, group: "waste", source: "IPCC AR6 GWP100 anaerobic decay" },
    waste_anaerobic_digestion: { value: -0.12, low: -0.20, high: -0.05, unit: "tCO2e/t", scope: 3, group: "waste", source: "Avoided landfill CH4 and fossil gas displacement" },
    waste_hazardous_incineration: { value: 1.15, low: 0.95, high: 1.35, unit: "tCO2e/t", scope: 3, group: "waste", source: "CPCB / literature" }
  }
};

// 2. interventions.json (30 circular interventions)
const interventions = [
  // Energy
  {
    id: "INT-COMP-AIR",
    name: "Compressed Air Ultrasonic Leak Detection & Tagged Repair",
    category: "energy",
    target_stream: "electricity",
    abatement: { low: 0.020, base: 0.040, high: 0.065, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "fixed_survey_kit", capex_value: 120000, savings_model: "avoided_purchase", lifetime_years: 3 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 1,
    disruption_days: 0,
    confidence: "high",
    evidence_notes: "Ultrasonic survey plus repair of identified leaks across distribution manifolds and couplings."
  },
  {
    id: "INT-VFD",
    name: "Variable Frequency Drives on Draft Fans and Pumping Loops",
    category: "energy",
    target_stream: "electricity",
    abatement: { low: 0.050, base: 0.080, high: 0.120, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "per_kw", capex_value: 350000, savings_model: "avoided_purchase", lifetime_years: 10 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 2,
    disruption_days: 1,
    confidence: "high",
    evidence_notes: "BEE DPR documented savings on fluctuating motor loads."
  },
  {
    id: "INT-IE4-MOTOR",
    name: "IE4 Super Premium Efficiency Motor Retrofits",
    category: "energy",
    target_stream: "electricity",
    abatement: { low: 0.030, base: 0.050, high: 0.070, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "per_unit", capex_value: 480000, savings_model: "avoided_purchase", lifetime_years: 12 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 2,
    disruption_days: 1,
    confidence: "high",
    evidence_notes: "IEC 60034-30-1 standard efficiency gains over standard IE1/IE2 motors."
  },
  {
    id: "INT-LED-LIGHTING",
    name: "Industrial High-Bay LED Retrofit & Occupancy Sensors",
    category: "energy",
    target_stream: "electricity",
    abatement: { low: 0.015, base: 0.025, high: 0.040, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "plant_area", capex_value: 150000, savings_model: "avoided_purchase", lifetime_years: 5 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 1,
    disruption_days: 0,
    confidence: "high",
    evidence_notes: "Straightforward lighting load reduction."
  },
  {
    id: "INT-IDLE-SHUTDOWN",
    name: "Automated Non-Operational Load Interlocking & Sub-metering",
    category: "energy",
    target_stream: "electricity",
    abatement: { low: 0.020, base: 0.045, high: 0.060, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "controls", capex_value: 95000, savings_model: "avoided_purchase", lifetime_years: 5 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 1,
    disruption_days: 0,
    confidence: "medium",
    evidence_notes: "Eliminates idle load; caveats note savings decay without continuous monitoring."
  },
  {
    id: "INT-SOLAR-ROOFTOP",
    name: "Captive Rooftop Solar PV Installation",
    category: "energy",
    target_stream: "electricity",
    abatement: { low: 0.150, base: 0.250, high: 0.350, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "per_kwp", capex_value: 21700000, savings_model: "avoided_purchase", lifetime_years: 25 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 3,
    disruption_days: 3,
    confidence: "high",
    evidence_notes: "Replaces grid import with zero-marginal cost self-generation."
  },
  {
    id: "INT-OPEN-ACCESS",
    name: "Group Captive / Green Open Access PPA",
    category: "energy",
    target_stream: "electricity",
    abatement: { low: 0.300, base: 0.500, high: 0.700, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "equity_collateral", capex_value: 2500000, savings_model: "tariff_delta", lifetime_years: 15 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 4,
    disruption_days: 0,
    confidence: "medium",
    evidence_notes: "Tariff delta savings model; cross-subsidy surcharges can compress margin."
  },
  {
    id: "INT-BOILER-ECONOMIZER",
    name: "Flue Gas Waste Heat Recovery Economizer for Steam Boiler",
    category: "energy",
    target_stream: "thermal_fuel",
    abatement: { low: 0.040, base: 0.060, high: 0.080, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "per_boiler", capex_value: 650000, savings_model: "avoided_purchase", lifetime_years: 10 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 2,
    disruption_days: 2,
    confidence: "high",
    evidence_notes: "Recovers boiler sensible flue heat to preheat boiler feed water."
  },
  {
    id: "INT-STEAM-TRAP",
    name: "Steam Trap Maintenance, Acoustic Testing & Insulation",
    category: "energy",
    target_stream: "thermal_fuel",
    abatement: { low: 0.030, base: 0.050, high: 0.080, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "network", capex_value: 180000, savings_model: "avoided_purchase", lifetime_years: 4 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 1,
    disruption_days: 0,
    confidence: "high",
    evidence_notes: "Repairs live steam blowing traps and uninsulated lines."
  },
  {
    id: "INT-WHR-KILN",
    name: "Hot Air Recirculation & Kiln Waste Heat Recovery",
    category: "energy",
    target_stream: "thermal_fuel",
    abatement: { low: 0.060, base: 0.100, high: 0.140, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "ductwork", capex_value: 1250000, savings_model: "avoided_purchase", lifetime_years: 8 },
    constraints: { max_substitution_pct: null, blocked_sectors: ["pharma_formulation", "plastic_moulding"], sector_caps: {} },
    difficulty: 3,
    disruption_days: 4,
    confidence: "medium",
    evidence_notes: "Exhaust ducting from cooling zone to combustion air preheating."
  },
  {
    id: "INT-BIOMASS-SWITCH",
    name: "Fuel Switch from Coal to Agricultural Residue Briquettes",
    category: "energy",
    target_stream: "thermal_fuel",
    abatement: { low: 0.700, base: 0.850, high: 0.950, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "burner_mod", capex_value: 850000, savings_model: "fuel_switch", lifetime_years: 8 },
    constraints: {
      max_substitution_pct: 1.0,
      blocked_sectors: ["ceramics"],
      sector_caps: {}
    },
    difficulty: 3,
    disruption_days: 3,
    confidence: "high",
    evidence_notes: "Replaces coal with biomass. Blocked for ceramics because fly ash ruins glazed tile finish."
  },

  // Material (Circular Substitution)
  {
    id: "INT-REC-ALUM",
    name: "Secondary / Recycled Aluminium Alloy Ingot Substitution",
    category: "material",
    target_stream: "mat_aluminium",
    abatement: { low: 0.90, base: 0.95, high: 0.96, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "blending_system", capex_value: 300000, savings_model: "price_delta", lifetime_years: 10 },
    constraints: { max_substitution_pct: 0.70, blocked_sectors: [], sector_caps: {} },
    difficulty: 2,
    disruption_days: 1,
    confidence: "high",
    evidence_notes: "IAI verified ~95% embodied emissions reduction; capped at 70% due to alloy trace element specifications."
  },
  {
    id: "INT-REC-STEEL",
    name: "Secondary EAF / Scrap-Derived Steel Billet Substitution",
    category: "material",
    target_stream: "mat_steel",
    abatement: { low: 0.70, base: 0.75, high: 0.78, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "procurement", capex_value: 200000, savings_model: "price_delta", lifetime_years: 5 },
    constraints: { max_substitution_pct: 0.80, blocked_sectors: [], sector_caps: { auto_components: 0.45 } },
    difficulty: 2,
    disruption_days: 0,
    confidence: "high",
    evidence_notes: "Scrap-based steel substitution. Capped at 45% in automotive components due to OEM fatigue certification."
  },
  {
    id: "INT-REC-COTTON",
    name: "Recycled Cotton Comber Noil / Mechanically Recycled Fibre",
    category: "material",
    target_stream: "mat_cotton_yarn",
    abatement: { low: 0.60, base: 0.67, high: 0.72, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "blending", capex_value: 150000, savings_model: "price_delta", lifetime_years: 5 },
    constraints: { max_substitution_pct: 0.25, blocked_sectors: [], sector_caps: {} },
    difficulty: 3,
    disruption_days: 1,
    confidence: "medium",
    evidence_notes: "Capped strictly at 25% because staple length degrades with mechanical shredding."
  },
  {
    id: "INT-RPET",
    name: "Post-Consumer Recycled PET (rPET) Resin Substitution",
    category: "material",
    target_stream: "mat_pet",
    abatement: { low: 0.50, base: 0.57, high: 0.62, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "crystallizer", capex_value: 450000, savings_model: "price_delta", lifetime_years: 7 },
    constraints: {
      max_substitution_pct: 0.50,
      blocked_sectors: ["pharma_formulation"],
      sector_caps: { food_processing: 0.35 }
    },
    difficulty: 3,
    disruption_days: 2,
    confidence: "high",
    evidence_notes: "Blocked for pharma formulations due to US/EU pharmacopeia primary packaging GMP rules. Capped at 35% in food contact."
  },
  {
    id: "INT-BLENDED-CEMENT",
    name: "Portland Pozzolana Cement (PPC) / Slag Cement (PSC) Switch",
    category: "material",
    target_stream: "mat_cement",
    abatement: { low: 0.30, base: 0.35, high: 0.40, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "silo_switch", capex_value: 120000, savings_model: "price_delta", lifetime_years: 10 },
    constraints: { max_substitution_pct: 0.70, blocked_sectors: [], sector_caps: {} },
    difficulty: 1,
    disruption_days: 0,
    confidence: "high",
    evidence_notes: "Complies with IS 1489 / IS 455 standards. Direct substitution for non-rapid-hardening structural work."
  },
  {
    id: "INT-REC-BOARD",
    name: "High Recycled-Content Corrugated Shipping Packaging",
    category: "material",
    target_stream: "mat_paper",
    abatement: { low: 0.30, base: 0.36, high: 0.42, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "specification", capex_value: 50000, savings_model: "price_delta", lifetime_years: 3 },
    constraints: { max_substitution_pct: 0.90, blocked_sectors: [], sector_caps: {} },
    difficulty: 1,
    disruption_days: 0,
    confidence: "high",
    evidence_notes: "Near-frictionless switch for secondary transit cartons."
  },
  {
    id: "INT-CULLET-GLASS",
    name: "Beneficiated Post-Consumer Glass Cullet Melting Addition",
    category: "material",
    target_stream: "mat_glass",
    abatement: { low: 0.30, base: 0.36, high: 0.42, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "crusher", capex_value: 600000, savings_model: "price_delta", lifetime_years: 10 },
    constraints: { max_substitution_pct: 0.60, blocked_sectors: [], sector_caps: {} },
    difficulty: 2,
    disruption_days: 1,
    confidence: "high",
    evidence_notes: "FEVE LCI verified. Lowers furnace melting temperature."
  },
  {
    id: "INT-FLY-ASH-BRICK",
    name: "Fly Ash & Pond Ash Masonry Block Substitution",
    category: "material",
    target_stream: "mat_cement",
    abatement: { low: 0.40, base: 0.50, high: 0.60, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "procurement", capex_value: 100000, savings_model: "price_delta", lifetime_years: 5 },
    constraints: { max_substitution_pct: 0.60, blocked_sectors: [], sector_caps: {} },
    difficulty: 1,
    disruption_days: 0,
    confidence: "high",
    evidence_notes: "Mandated under MoEFCC Ash Utilisation Notification."
  },

  // Process
  {
    id: "INT-COLD-DYEING",
    name: "Cold-Pad-Batch Dyeing for Cellulosic Woven Fabrics",
    category: "process",
    target_stream: "thermal_fuel",
    abatement: { low: 0.200, base: 0.300, high: 0.400, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "dyeing_padder", capex_value: 1800000, savings_model: "avoided_purchase", lifetime_years: 10 },
    constraints: { max_substitution_pct: null, blocked_sectors: ["foundry_casting", "ceramics", "auto_components", "paper_packaging", "fabrication", "chemicals"], sector_caps: {} },
    difficulty: 3,
    disruption_days: 3,
    confidence: "medium",
    evidence_notes: "Eliminates high-temperature dye bath heating for cotton fabric lots."
  },
  {
    id: "INT-OXY-FUEL",
    name: "Oxy-Fuel Combustion Conversion on Melting Furnaces",
    category: "process",
    target_stream: "thermal_fuel",
    abatement: { low: 0.150, base: 0.250, high: 0.350, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "skid", capex_value: 3200000, savings_model: "avoided_purchase", lifetime_years: 10 },
    constraints: { max_substitution_pct: null, blocked_sectors: ["textile_dyeing", "food_processing", "pharma_formulation", "plastic_moulding"], sector_caps: {} },
    difficulty: 4,
    disruption_days: 5,
    confidence: "medium",
    evidence_notes: "Replaces combustion air with pure oxygen, drastically lowering exhaust flue losses."
  },
  {
    id: "INT-COMBUSTION-TUNING",
    name: "Automated Flue Gas O2 Trim & Air-to-Fuel Ratio Control",
    category: "process",
    target_stream: "thermal_fuel",
    abatement: { low: 0.030, base: 0.050, high: 0.070, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "sensor_kit", capex_value: 380000, savings_model: "avoided_purchase", lifetime_years: 7 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 2,
    disruption_days: 1,
    confidence: "high",
    evidence_notes: "Zirconia oxygen sensor dynamically corrects excess combustion air."
  },
  {
    id: "INT-FOUNDRY-SAND-RECLAIM",
    name: "Thermal-Mechanical Sand Reclamation Loop",
    category: "process",
    target_stream: "waste",
    abatement: { low: 0.600, base: 0.750, high: 0.850, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "reclaimer", capex_value: 4200000, savings_model: "avoided_purchase", lifetime_years: 12 },
    constraints: { max_substitution_pct: null, blocked_sectors: ["textile_dyeing", "food_processing", "pharma_formulation", "plastic_moulding", "paper_packaging"], sector_caps: {} },
    difficulty: 3,
    disruption_days: 4,
    confidence: "high",
    evidence_notes: "Reclaims 75% of silica sand and cuts hazardous core-sand disposal fees."
  },
  {
    id: "INT-INHOUSE-REGRIND",
    name: "Closed-Loop Runner Regrind & Internal Polymer Recycling",
    category: "process",
    target_stream: "waste",
    abatement: { low: 0.500, base: 0.700, high: 0.850, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "granulator", capex_value: 280000, savings_model: "avoided_purchase", lifetime_years: 8 },
    constraints: { max_substitution_pct: null, blocked_sectors: ["foundry_casting", "ceramics", "textile_dyeing"], sector_caps: {} },
    difficulty: 2,
    disruption_days: 0,
    confidence: "high",
    evidence_notes: "Granulates and blends runners immediately back into moulding hoppers."
  },

  // Waste & Symbiosis
  {
    id: "INT-ANAEROBIC-DIGESTION",
    name: "On-site Bio-Methanation of Organic Wet Effluent & Sludge",
    category: "waste",
    target_stream: "waste",
    abatement: { low: 0.700, base: 0.850, high: 0.950, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "cbr_reactor", capex_value: 2600000, savings_model: "avoided_purchase", lifetime_years: 15 },
    constraints: { max_substitution_pct: null, blocked_sectors: ["foundry_casting", "fabrication"], sector_caps: {} },
    difficulty: 4,
    disruption_days: 4,
    confidence: "medium",
    evidence_notes: "Diverts high-COD effluent from aerobic lagoons to anaerobic digester."
  },
  {
    id: "INT-SOLVENT-RECOVERY",
    name: "Wiped-Film Evaporator & Solvent Fractional Distillation",
    category: "waste",
    target_stream: "waste",
    abatement: { low: 0.600, base: 0.750, high: 0.850, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "distillation_skid", capex_value: 1950000, savings_model: "price_delta", lifetime_years: 10 },
    constraints: { max_substitution_pct: null, blocked_sectors: ["textile_dyeing", "ceramics", "fabrication", "paper_packaging"], sector_caps: {} },
    difficulty: 3,
    disruption_days: 2,
    confidence: "high",
    evidence_notes: "Recovers 75% of isopropyl alcohol and ethyl acetate on-site."
  },
  {
    id: "INT-SLAG-VALORISATION",
    name: "Blast Furnace / Cupola Slag Offtake for Cement Co-Processing",
    category: "waste",
    target_stream: "waste",
    abatement: { low: 0.500, base: 0.700, high: 0.850, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "handling", capex_value: 150000, savings_model: "price_delta", lifetime_years: 5 },
    constraints: { max_substitution_pct: null, blocked_sectors: ["textile_dyeing", "food_processing", "pharma_formulation", "plastic_moulding"], sector_caps: {} },
    difficulty: 2,
    disruption_days: 0,
    confidence: "high",
    evidence_notes: "Industrial symbiosis turning solid metallurgical waste into revenue stream."
  },
  {
    id: "INT-COMPOSTING",
    name: "On-Site Rotary Drum Composting for Organic Solid Waste",
    category: "waste",
    target_stream: "waste",
    abatement: { low: 0.400, base: 0.600, high: 0.750, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "drum", capex_value: 320000, savings_model: "avoided_purchase", lifetime_years: 8 },
    constraints: { max_substitution_pct: null, blocked_sectors: ["foundry_casting", "auto_components", "fabrication"], sector_caps: {} },
    difficulty: 2,
    disruption_days: 0,
    confidence: "medium",
    evidence_notes: "Avoids methane generation from uncontrolled dump sites."
  },

  // Logistics
  {
    id: "INT-MODAL-SHIFT-RAIL",
    name: "Inbound Bulk Freight Modal Shift from Road to Rail",
    category: "logistics",
    target_stream: "freight_inbound",
    abatement: { low: 0.650, base: 0.760, high: 0.820, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "siding_handling", capex_value: 800000, savings_model: "price_delta", lifetime_years: 10 },
    constraints: { max_substitution_pct: 0.80, blocked_sectors: [], sector_caps: {} },
    difficulty: 3,
    disruption_days: 0,
    confidence: "medium",
    evidence_notes: "Rail emits ~0.022 kgCO2e/t-km vs road at ~0.095. Lowers Scope 3 bulk transport."
  },
  {
    id: "INT-ROUTE-OPTIMISATION",
    name: "Finished Goods Distribution Dispatch & Cube Optimization",
    category: "logistics",
    target_stream: "freight_outbound",
    abatement: { low: 0.080, base: 0.120, high: 0.160, unit: "fraction_of_target_stream" },
    economics: { capex_basis: "tms_software", capex_value: 240000, savings_model: "avoided_purchase", lifetime_years: 5 },
    constraints: { max_substitution_pct: null, blocked_sectors: [], sector_caps: {} },
    difficulty: 1,
    disruption_days: 0,
    confidence: "high",
    evidence_notes: "Load consolidations cut empty running and trip frequencies."
  }
];

// 3. sectors.json (10 Indian Industrial Sectors)
const sectors = {
  sectors: [
    {
      sector_key: "textile_dyeing",
      sector_name: "Textile Dyeing & Finishing",
      clusters: [{ name: "Tirupur", state: "Tamil Nadu" }, { name: "Surat", state: "Gujarat" }],
      benchmarks: {
        electricity_kwh_per_t: { p25: 850, p50: 1200, p75: 1650 },
        thermal_gj_per_t: { p25: 18.0, p50: 24.5, p75: 32.0 },
        gate_to_gate_tco2e_per_t: { p25: 2.2, p50: 3.1, p75: 4.2 }
      },
      demo_profile: {
        company_name: "Tirupur Processors Pvt Ltd",
        annual_output_t: 3600,
        revenue_cr: 42.0,
        electricity_kwh: 4800000,
        coal_t: 5200,
        diesel_l: 45000,
        cotton_yarn_t: 3900,
        waste_t: 720,
        freight_tkm: 1800000,
        state: "Tamil Nadu",
        reported_footprint_tco2e: 24069
      }
    },
    {
      sector_key: "foundry_casting",
      sector_name: "Cast Iron & Steel Foundry",
      clusters: [{ name: "Coimbatore", state: "Tamil Nadu" }, { name: "Rajkot", state: "Gujarat" }, { name: "Kolhapur", state: "Maharashtra" }],
      benchmarks: {
        electricity_kwh_per_t: { p25: 620, p50: 850, p75: 1100 },
        thermal_gj_per_t: { p25: 8.5, p50: 12.0, p75: 16.5 },
        gate_to_gate_tco2e_per_t: { p25: 1.1, p50: 1.6, p75: 2.3 }
      },
      demo_profile: {
        company_name: "Rajkot Auto Castings",
        annual_output_t: 7200,
        revenue_cr: 58.0,
        electricity_kwh: 7200000,
        coal_t: 3100,
        diesel_l: 60000,
        steel_t: 7800,
        waste_t: 1400,
        freight_tkm: 2400000,
        state: "Gujarat",
        reported_footprint_tco2e: 18786
      }
    },
    {
      sector_key: "ceramics",
      sector_name: "Ceramic Floor & Wall Tiles",
      clusters: [{ name: "Morbi", state: "Gujarat" }, { name: "Kadi", state: "Gujarat" }],
      benchmarks: {
        electricity_kwh_per_t: { p25: 140, p50: 190, p75: 260 },
        thermal_gj_per_t: { p25: 4.8, p50: 6.5, p75: 8.5 },
        gate_to_gate_tco2e_per_t: { p25: 0.55, p50: 0.72, p75: 0.95 }
      },
      demo_profile: {
        company_name: "Morbi Vitrified Ceramics Ltd",
        annual_output_t: 32000,
        revenue_cr: 75.0,
        electricity_kwh: 6800000,
        natural_gas_sm3: 6500000,
        coal_t: 4200,
        diesel_l: 35000,
        clay_minerals_t: 35000,
        waste_t: 2200,
        freight_tkm: 5500000,
        state: "Gujarat",
        reported_footprint_tco2e: 26075
      }
    },
    {
      sector_key: "food_processing",
      sector_name: "Food Processing & Packaged Goods",
      clusters: [{ name: "Anand", state: "Gujarat" }, { name: "Pune", state: "Maharashtra" }],
      benchmarks: {
        electricity_kwh_per_t: { p25: 280, p50: 420, p75: 580 },
        thermal_gj_per_t: { p25: 3.2, p50: 4.8, p75: 6.8 },
        gate_to_gate_tco2e_per_t: { p25: 0.45, p50: 0.65, p75: 0.88 }
      },
      demo_profile: {
        company_name: "Western Agro Foods",
        annual_output_t: 12000,
        revenue_cr: 48.0,
        electricity_kwh: 3800000,
        coal_t: 1600,
        diesel_l: 40000,
        pet_resin_t: 850,
        waste_t: 950,
        freight_tkm: 1900000,
        state: "Maharashtra",
        reported_footprint_tco2e: 7623
      }
    },
    {
      sector_key: "auto_components",
      sector_name: "Automotive Precision Machining & Forging",
      clusters: [{ name: "Pune", state: "Maharashtra" }, { name: "Chennai", state: "Tamil Nadu" }, { name: "Gurugram", state: "Haryana" }],
      benchmarks: {
        electricity_kwh_per_t: { p25: 750, p50: 1050, p75: 1450 },
        thermal_gj_per_t: { p25: 5.5, p50: 8.0, p75: 11.5 },
        gate_to_gate_tco2e_per_t: { p25: 1.1, p50: 1.5, p75: 2.1 }
      },
      demo_profile: {
        company_name: "Precision Auto Drives",
        annual_output_t: 4500,
        revenue_cr: 65.0,
        electricity_kwh: 5200000,
        diesel_l: 85000,
        steel_t: 5100,
        aluminium_t: 600,
        waste_t: 480,
        freight_tkm: 2100000,
        state: "Maharashtra",
        reported_footprint_tco2e: 11807
      }
    },
    {
      sector_key: "pharma_formulation",
      sector_name: "Pharmaceutical Formulations",
      clusters: [{ name: "Baddi", state: "Himachal Pradesh" }, { name: "Ahmedabad", state: "Gujarat" }, { name: "Hyderabad", state: "Telangana" }],
      benchmarks: {
        electricity_kwh_per_t: { p25: 1200, p50: 1800, p75: 2500 },
        thermal_gj_per_t: { p25: 8.0, p50: 12.5, p75: 18.0 },
        gate_to_gate_tco2e_per_t: { p25: 1.6, p50: 2.4, p75: 3.4 }
      },
      demo_profile: {
        company_name: "Auro Healthcare Formulations",
        annual_output_t: 1800,
        revenue_cr: 55.0,
        electricity_kwh: 3600000,
        furnace_oil_kg: 850000,
        diesel_l: 30000,
        pet_blister_t: 420,
        waste_t: 310,
        freight_tkm: 1200000,
        state: "Gujarat",
        reported_footprint_tco2e: 7127
      }
    },
    {
      sector_key: "plastic_moulding",
      sector_name: "Polymer Injection & Blow Moulding",
      clusters: [{ name: "Daman", state: "DNH & Daman" }, { name: "Ahmedabad", state: "Gujarat" }],
      benchmarks: {
        electricity_kwh_per_t: { p25: 850, p50: 1150, p75: 1550 },
        thermal_gj_per_t: { p25: 1.0, p50: 2.0, p75: 3.5 },
        gate_to_gate_tco2e_per_t: { p25: 0.75, p50: 0.98, p75: 1.35 }
      },
      demo_profile: {
        company_name: "Daman Polymers Ltd",
        annual_output_t: 3800,
        revenue_cr: 34.0,
        electricity_kwh: 4600000,
        diesel_l: 25000,
        pet_virgin_t: 3950,
        waste_t: 280,
        freight_tkm: 1400000,
        state: "Gujarat",
        reported_footprint_tco2e: 8053
      }
    },
    {
      sector_key: "paper_packaging",
      sector_name: "Kraft Paper & Corrugated Packaging",
      clusters: [{ name: "Vapi", state: "Gujarat" }, { name: "Muzaffarnagar", state: "Uttar Pradesh" }],
      benchmarks: {
        electricity_kwh_per_t: { p25: 450, p50: 620, p75: 850 },
        thermal_gj_per_t: { p25: 12.0, p50: 16.5, p75: 22.0 },
        gate_to_gate_tco2e_per_t: { p25: 1.4, p50: 1.9, p75: 2.7 }
      },
      demo_profile: {
        company_name: "Vapi Paper Mills",
        annual_output_t: 8500,
        revenue_cr: 46.0,
        electricity_kwh: 5500000,
        coal_t: 3600,
        diesel_l: 30000,
        waste_paper_t: 9200,
        waste_t: 1250,
        freight_tkm: 2600000,
        state: "Gujarat",
        reported_footprint_tco2e: 13960
      }
    },
    {
      sector_key: "fabrication",
      sector_name: "Structural & Heavy Fabrication",
      clusters: [{ name: "Faridabad", state: "Haryana" }, { name: "Peenya", state: "Karnataka" }],
      benchmarks: {
        electricity_kwh_per_t: { p25: 350, p50: 520, p75: 750 },
        thermal_gj_per_t: { p25: 2.5, p50: 4.0, p75: 6.0 },
        gate_to_gate_tco2e_per_t: { p25: 0.55, p50: 0.78, p75: 1.10 }
      },
      demo_profile: {
        company_name: "Haryana Heavy Structures",
        annual_output_t: 3200,
        revenue_cr: 38.0,
        electricity_kwh: 2200000,
        diesel_l: 45000,
        steel_t: 3400,
        waste_t: 320,
        freight_tkm: 1700000,
        state: "Haryana",
        reported_footprint_tco2e: 5169
      }
    },
    {
      sector_key: "chemicals",
      sector_name: "Specialty Chemicals & Intermediates",
      clusters: [{ name: "Ankleshwar", state: "Gujarat" }, { name: "Dahej", state: "Gujarat" }],
      benchmarks: {
        electricity_kwh_per_t: { p25: 650, p50: 950, p75: 1350 },
        thermal_gj_per_t: { p25: 9.0, p50: 13.5, p75: 19.0 },
        gate_to_gate_tco2e_per_t: { p25: 1.3, p50: 1.8, p75: 2.6 }
      },
      demo_profile: {
        company_name: "Ankleshwar Organics",
        annual_output_t: 2400,
        revenue_cr: 52.0,
        electricity_kwh: 2800000,
        natural_gas_sm3: 1200000,
        furnace_oil_kg: 450000,
        diesel_l: 25000,
        solvents_t: 1200,
        waste_t: 580,
        freight_tkm: 1600000,
        state: "Gujarat",
        reported_footprint_tco2e: 7458
      }
    }
  ]
};

// Write files
fs.writeFileSync(path.join(legacyDir, 'emission_factors.json'), JSON.stringify(emissionFactors, null, 2));
fs.writeFileSync(path.join(legacyDir, 'interventions.json'), JSON.stringify(interventions, null, 2));
fs.writeFileSync(path.join(legacyDir, 'sectors.json'), JSON.stringify(sectors, null, 2));

console.log('Successfully generated legacy reference data in data/legacy/:');
console.log('- emission_factors.json:', Object.keys(emissionFactors.factors).length, 'factors');
console.log('- interventions.json:', interventions.length, 'interventions');
console.log('- sectors.json:', sectors.sectors.length, 'sectors');
