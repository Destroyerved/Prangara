const fs = require('fs');
const path = require('path');

const prangaraDir = 'c:/Users/vedan/OneDrive/Desktop/prangara';
const datasetDir = 'c:/Users/vedan/OneDrive/Desktop/Dataset';

const prangaraCsv = path.join(prangaraDir, 'csv');
const prangaraJson = path.join(prangaraDir, 'json');
const prangaraSql = path.join(prangaraDir, 'sql');
const prangaraReports = path.join(prangaraDir, 'reports');
const prangaraMeta = path.join(prangaraDir, 'metadata');

[prangaraCsv, prangaraJson, prangaraSql, prangaraReports, prangaraMeta].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

console.log("Starting dedicated file transfer to prangara with domain-specific naming...");

// Helper: Convert array of objects to CSV
function toCSV(arr) {
  if (!arr || arr.length === 0) return '';
  const headers = Object.keys(arr[0]);
  const rows = arr.map(obj => {
    return headers.map(h => {
      let v = obj[h];
      if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
      if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
      return v === null || v === undefined ? '' : v;
    }).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

// 1. Emission Factors (Clean & Refined)
const factorsRaw = JSON.parse(fs.readFileSync(path.join(datasetDir, 'data/clean/emission_factors_verified.json'), 'utf8'));
const factorsList = Object.keys(factorsRaw.factors).map(k => {
  const f = factorsRaw.factors[k];
  return {
    factor_key: f.key,
    factor_group: f.group,
    display_name: f.display_name,
    emission_factor_value: f.value,
    uncertainty_low: f.low,
    uncertainty_high: f.high,
    canonical_unit: f.unit,
    scope: f.scope,
    gas_basis: f.gas_basis,
    geography: f.geography,
    system_boundary: f.boundary,
    data_vintage_year: f.data_year,
    source_id: f.source_id,
    conversion_applied: f.conversion_applied,
    conversion_formula: f.conversion_formula,
    proxy_for_india: f.proxy_for_india,
    confidence_rating: f.confidence,
    verification_status: f.verification_status,
    verified_at: f.verified_at
  };
});

fs.writeFileSync(
  path.join(prangaraJson, 'chakra_industrial_emission_factors_verified.json'),
  JSON.stringify(factorsList, null, 2)
);
fs.writeFileSync(
  path.join(prangaraCsv, 'chakra_industrial_emission_factors_verified.csv'),
  toCSV(factorsList)
);
console.log("✓ Transferred chakra_industrial_emission_factors_verified (.json & .csv)");

// 2. Circular Interventions Library
const interventionsList = JSON.parse(fs.readFileSync(path.join(datasetDir, 'data/clean/interventions_verified.json'), 'utf8'));
const interventionsFlattened = interventionsList.map(i => ({
  intervention_id: i.id,
  intervention_name: i.name,
  category: i.category,
  target_stream: i.target_stream,
  applicable_sectors: i.applicable_sectors.join('; '),
  abatement_low_fraction: i.abatement.low,
  abatement_base_fraction: i.abatement.base,
  abatement_high_fraction: i.abatement.high,
  abatement_unit: i.abatement.unit,
  abatement_source_id: i.abatement.source_id,
  capex_basis: i.economics.capex_basis,
  capex_inr: i.economics.capex_value,
  savings_model: i.economics.savings_model,
  asset_lifetime_years: i.economics.lifetime_years,
  max_substitution_fraction: i.constraints.max_substitution_pct,
  blocked_sectors: (i.constraints.blocked_sectors || []).join('; '),
  sector_caps: JSON.stringify(i.constraints.sector_caps || {}),
  difficulty_score_1_to_5: i.difficulty,
  disruption_downtime_days: i.disruption_days,
  confidence_tier: i.confidence,
  evidence_notes: i.evidence_notes.join('; '),
  actual_vendor_quote_required: i.actual_quote_required
}));

fs.writeFileSync(
  path.join(prangaraJson, 'chakra_circular_interventions_library.json'),
  JSON.stringify(interventionsList, null, 2)
);
fs.writeFileSync(
  path.join(prangaraCsv, 'chakra_circular_interventions_library.csv'),
  toCSV(interventionsFlattened)
);
console.log("✓ Transferred chakra_circular_interventions_library (.json & .csv)");

// 3. Industrial Sector Benchmarks & Demo Profiles
const sectorsRaw = JSON.parse(fs.readFileSync(path.join(datasetDir, 'data/clean/sectors_verified.json'), 'utf8')).sectors;
const sectorsFlattened = sectorsRaw.map(s => ({
  sector_key: s.sector_key,
  sector_name: s.sector_name,
  primary_clusters: s.clusters.map(c => `${c.name} (${c.state})`).join('; '),
  cluster_count: s.clusters.length,
  electricity_sec_low_kwh_per_t: s.benchmarks.electricity_kwh_per_t.low,
  electricity_sec_median_kwh_per_t: s.benchmarks.electricity_kwh_per_t.median,
  electricity_sec_high_kwh_per_t: s.benchmarks.electricity_kwh_per_t.high,
  thermal_sec_low_gj_per_t: s.benchmarks.thermal_gj_per_t.low,
  thermal_sec_median_gj_per_t: s.benchmarks.thermal_gj_per_t.median,
  thermal_sec_high_gj_per_t: s.benchmarks.thermal_gj_per_t.high,
  gate_to_gate_carbon_low_tco2e_per_t: s.benchmarks.gate_to_gate_tco2e_per_t.low,
  gate_to_gate_carbon_median_tco2e_per_t: s.benchmarks.gate_to_gate_tco2e_per_t.median,
  gate_to_gate_carbon_high_tco2e_per_t: s.benchmarks.gate_to_gate_tco2e_per_t.high,
  benchmark_status: s.benchmarks.electricity_kwh_per_t.status,
  regulatory_flags: s.regulatory_flags.join('; '),
  demo_company_name: s.demo_profile.company_name,
  demo_annual_output_tonnes: s.demo_profile.annual_output_t,
  demo_revenue_inr_crores: s.demo_profile.revenue_cr,
  demo_reported_footprint_tco2e: s.demo_profile.reported_footprint_tco2e,
  demo_is_synthetic: s.demo_profile.synthetic
}));

fs.writeFileSync(
  path.join(prangaraJson, 'chakra_industrial_sector_benchmarks.json'),
  JSON.stringify(sectorsRaw, null, 2)
);
fs.writeFileSync(
  path.join(prangaraCsv, 'chakra_industrial_sector_benchmarks.csv'),
  toCSV(sectorsFlattened)
);
console.log("✓ Transferred chakra_industrial_sector_benchmarks (.json & .csv)");

// 4. Environmental Regulations
const regRaw = JSON.parse(fs.readFileSync(path.join(datasetDir, 'data/clean/regulations_verified.json'), 'utf8')).regulations;
const regFlattened = regRaw.map(r => ({
  regulation_id: r.regulation_id,
  title: r.title,
  authority: r.authority,
  source_id: r.source_id,
  applicable_sectors: r.applicable_sectors.join('; '),
  key_requirements: r.key_requirements,
  status: r.status
}));

fs.writeFileSync(
  path.join(prangaraJson, 'chakra_environmental_regulations.json'),
  JSON.stringify(regRaw, null, 2)
);
fs.writeFileSync(
  path.join(prangaraCsv, 'chakra_environmental_regulations.csv'),
  toCSV(regFlattened)
);
console.log("✓ Transferred chakra_environmental_regulations (.json & .csv)");

// 5. Coal Conversions Model
const coalRaw = JSON.parse(fs.readFileSync(path.join(datasetDir, 'data/derived/coal_conversions.json'), 'utf8'));
const coalList = Object.keys(coalRaw.grades).map(g => {
  const item = coalRaw.grades[g];
  return {
    coal_grade: g,
    gross_cv_band_kcal_per_kg: item.gross_cv_band_kcal_kg,
    ncv_gj_per_tonne: item.ncv_gj_t,
    calculated_emission_factor_tco2_per_t: item.calculated_tco2_per_t,
    reference_source: coalRaw.metadata.reference_combustion_source,
    oxidation_factor: coalRaw.metadata.oxidation_factor,
    notes: item.note || ''
  };
});

fs.writeFileSync(
  path.join(prangaraJson, 'chakra_coal_conversions_model.json'),
  JSON.stringify(coalRaw, null, 2)
);
fs.writeFileSync(
  path.join(prangaraCsv, 'chakra_coal_conversions_model.csv'),
  toCSV(coalList)
);
console.log("✓ Transferred chakra_coal_conversions_model (.json & .csv)");

// 6. Waste Landfill Methane & AD Model
const wasteRaw = JSON.parse(fs.readFileSync(path.join(datasetDir, 'data/derived/waste_factors.json'), 'utf8'));
fs.writeFileSync(
  path.join(prangaraJson, 'chakra_waste_landfill_methane_model.json'),
  JSON.stringify(wasteRaw, null, 2)
);
const wasteRows = [
  { model_name: "IPCC_Vol5_FOD_Landfill", formula: wasteRaw.landfill_fod_model.formula, output_tco2e_per_tonne: wasteRaw.landfill_fod_model.output_tco2e_per_t, gwp_basis: wasteRaw.metadata.gwp_version, notes: "Unmanaged deep landfill" },
  { model_name: "Net_Anaerobic_Digestion", formula: wasteRaw.anaerobic_digestion_model.formula, output_tco2e_per_tonne: wasteRaw.anaerobic_digestion_model.conservative_screening_factor, gwp_basis: wasteRaw.metadata.gwp_version, notes: "Avoided methane + fossil offset - parasitic load" }
];
fs.writeFileSync(
  path.join(prangaraCsv, 'chakra_waste_landfill_methane_model.csv'),
  toCSV(wasteRows)
);
console.log("✓ Transferred chakra_waste_landfill_methane_model (.json & .csv)");

// 7. State Grid Generation Mix Model
const stateGridRaw = JSON.parse(fs.readFileSync(path.join(datasetDir, 'data/derived/state_grid_experimental.json'), 'utf8'));
const stateGridList = Object.keys(stateGridRaw.state_variants).map(st => {
  const item = stateGridRaw.state_variants[st];
  return {
    state_code: st,
    state_name: item.name,
    derived_grid_factor_tco2e_per_mwh: item.derived_value,
    confidence: item.confidence,
    status: item.status,
    methodology: stateGridRaw.metadata.methodology
  };
});
fs.writeFileSync(
  path.join(prangaraJson, 'chakra_state_grid_generation_mix.json'),
  JSON.stringify(stateGridRaw, null, 2)
);
fs.writeFileSync(
  path.join(prangaraCsv, 'chakra_state_grid_generation_mix.csv'),
  toCSV(stateGridList)
);
console.log("✓ Transferred chakra_state_grid_generation_mix (.json & .csv)");

// 8. SQL Schemas
const sqlSchemaContent = fs.readFileSync(path.join(datasetDir, 'data/refined/sql/chakra_schema.sql'), 'utf8');
const sqlSeedContent = fs.readFileSync(path.join(datasetDir, 'data/refined/sql/chakra_seed_data.sql'), 'utf8');

fs.writeFileSync(path.join(prangaraSql, 'chakra_decarbonization_schema.sql'), sqlSchemaContent);
fs.writeFileSync(path.join(prangaraSql, 'chakra_decarbonization_seed_data.sql'), sqlSeedContent);
console.log("✓ Transferred chakra_decarbonization_schema.sql & seed_data.sql");

// 9. Source Registry & Checksums & Manifest
fs.copyFileSync(
  path.join(datasetDir, 'data/metadata/source_registry.json'),
  path.join(prangaraMeta, 'chakra_source_registry.json')
);
fs.copyFileSync(
  path.join(datasetDir, 'data/metadata/download_manifest.csv'),
  path.join(prangaraCsv, 'chakra_download_manifest.csv')
);
fs.copyFileSync(
  path.join(datasetDir, 'data/metadata/replacement_map.json'),
  path.join(prangaraMeta, 'chakra_replacement_map.json')
);
console.log("✓ Transferred chakra metadata & manifest files");

// 10. Verification Reports
fs.copyFileSync(
  path.join(datasetDir, 'reports/source_verification_report.md'),
  path.join(prangaraReports, 'chakra_source_verification_report.md')
);
fs.copyFileSync(
  path.join(datasetDir, 'reports/source_verification_report.csv'),
  path.join(prangaraReports, 'chakra_source_verification_report.csv')
);
fs.copyFileSync(
  path.join(datasetDir, 'reports/source_verification_report.csv'),
  path.join(prangaraCsv, 'chakra_source_verification_report.csv')
);
console.log("✓ Transferred chakra verification reports (.md & .csv)");

// 11. Synchronize & Enrich prangara/type_dictionary.json
const prangaraDictPath = path.join(prangaraDir, 'type_dictionary.json');
let prangaraDict = {};
if (fs.existsSync(prangaraDictPath)) {
  prangaraDict = JSON.parse(fs.readFileSync(prangaraDictPath, 'utf8'));
}

prangaraDict.version = "2.0.0";
prangaraDict.pipeline = "Unified Authentic & Verified Decarbonization Architecture (PS11 Waste-to-Carbon & Chakra PS10 Decarbonization)";

prangaraDict.datasets = prangaraDict.datasets || {};

// Add full field dictionaries for each dedicated dataset
prangaraDict.datasets.chakra_industrial_emission_factors = {
  description: "Official and verified greenhouse gas emission factors across electricity, fuels, materials, freight, and waste.",
  primary_key: "factor_key",
  fields: {
    factor_key: { type: "VARCHAR(64)", nullable: false, description: "Canonical unique factor identifier" },
    factor_group: { type: "ENUM(electricity, fuels, materials, logistics, waste)", nullable: false },
    display_name: { type: "VARCHAR(255)", nullable: false },
    emission_factor_value: { type: "NUMERIC(12,4)", nullable: false, unit: "canonical_unit" },
    uncertainty_low: { type: "NUMERIC(12,4)", nullable: true },
    uncertainty_high: { type: "NUMERIC(12,4)", nullable: true },
    canonical_unit: { type: "ENUM(tCO2e/MWh, kgCO2e/litre, kgCO2e/Sm3, kgCO2e/kg, tCO2e/t, kgCO2e/t-km)", nullable: false },
    scope: { type: "SMALLINT", min: 1, max: 3, nullable: false },
    gas_basis: { type: "VARCHAR(128)", nullable: false },
    geography: { type: "VARCHAR(128)", nullable: false },
    system_boundary: { type: "VARCHAR(128)", nullable: false, examples: ["cradle-to-gate", "gate-to-gate", "direct combustion", "well-to-wheel"] },
    source_id: { type: "VARCHAR(64)", nullable: false, foreign_key: "chakra_source_registry.source_id" },
    conversion_applied: { type: "BOOLEAN", nullable: false },
    proxy_for_india: { type: "BOOLEAN", nullable: false },
    confidence_rating: { type: "ENUM(HIGH, MEDIUM, LOW)", nullable: false },
    verification_status: { type: "ENUM(VERIFIED_OFFICIAL, VERIFIED_INDUSTRY_LCI, VERIFIED_METHODOLOGY, DERIVED_TRANSPARENT, SCREENING_ONLY)", nullable: false }
  }
};

prangaraDict.datasets.chakra_circular_interventions = {
  description: "30 costed, constraint-checked circular economy interventions for industrial manufacturing SMEs.",
  primary_key: "intervention_id",
  fields: {
    intervention_id: { type: "VARCHAR(32)", nullable: false, format: "INT-XXX" },
    intervention_name: { type: "VARCHAR(255)", nullable: false },
    category: { type: "ENUM(energy, material, process, waste, logistics)", nullable: false },
    target_stream: { type: "VARCHAR(64)", nullable: false },
    applicable_sectors: { type: "TEXT", nullable: false, description: "Semicolon-separated list of compatible sector keys" },
    abatement_base_fraction: { type: "NUMERIC(6,4)", min: 0.0, max: 1.0, nullable: false, unit: "fraction_of_stream" },
    capex_basis: { type: "VARCHAR(64)", nullable: false },
    capex_inr: { type: "NUMERIC(14,2)", unit: "INR", nullable: true },
    savings_model: { type: "ENUM(avoided_purchase, tariff_delta, fuel_switch, price_delta, none)", nullable: false },
    asset_lifetime_years: { type: "INTEGER", min: 1, max: 30, nullable: false },
    max_substitution_fraction: { type: "NUMERIC(4,2)", min: 0.0, max: 1.0, nullable: true },
    difficulty_score_1_to_5: { type: "SMALLINT", min: 1, max: 5, nullable: false },
    disruption_downtime_days: { type: "INTEGER", min: 0, nullable: false },
    planning_grade_capex: { type: "BOOLEAN", default: true, nullable: false },
    actual_vendor_quote_required: { type: "BOOLEAN", default: true, nullable: false }
  }
};

prangaraDict.datasets.chakra_industrial_sector_benchmarks = {
  description: "BEE MSME cluster reported Specific Energy Consumption ranges and gate-to-gate carbon intensity for 10 Indian sectors.",
  primary_key: "sector_key",
  fields: {
    sector_key: { type: "VARCHAR(64)", nullable: false },
    sector_name: { type: "VARCHAR(255)", nullable: false },
    primary_clusters: { type: "TEXT", nullable: false },
    cluster_count: { type: "INTEGER", min: 1, nullable: false },
    electricity_sec_median_kwh_per_t: { type: "NUMERIC(10,2)", unit: "kWh/t", nullable: false },
    thermal_sec_median_gj_per_t: { type: "NUMERIC(10,2)", unit: "GJ/t", nullable: false },
    gate_to_gate_carbon_median_tco2e_per_t: { type: "NUMERIC(10,2)", unit: "tCO2e/t", nullable: false },
    benchmark_status: { type: "VARCHAR(64)", default: "VERIFIED_OFFICIAL_SCREENING", nullable: false },
    demo_company_name: { type: "VARCHAR(255)", nullable: false },
    demo_annual_output_tonnes: { type: "NUMERIC(12,2)", unit: "tonnes", nullable: false },
    demo_reported_footprint_tco2e: { type: "NUMERIC(12,2)", unit: "tCO2e", nullable: false },
    demo_is_synthetic: { type: "BOOLEAN", default: true, nullable: false }
  }
};

prangaraDict.datasets.chakra_coal_conversions = {
  description: "Indian non-coking coal grade G1 to G17 Gross CV bands, Net Calorific Values, and IPCC calculated carbon factors.",
  primary_key: "coal_grade",
  fields: {
    coal_grade: { type: "VARCHAR(8)", nullable: false, format: "G1 to G17" },
    gross_cv_band_kcal_per_kg: { type: "VARCHAR(32)", nullable: false },
    ncv_gj_per_tonne: { type: "NUMERIC(6,2)", unit: "GJ/t", nullable: false },
    calculated_emission_factor_tco2_per_t: { type: "NUMERIC(6,3)", unit: "tCO2/t", nullable: false }
  }
};

fs.writeFileSync(prangaraDictPath, JSON.stringify(prangaraDict, null, 2));
console.log("✓ Synchronized prangara/type_dictionary.json with unified multi-domain schemas");

console.log("\n============================================================");
console.log("All processed data files successfully shifted to prangara!");
console.log("Target directory: " + prangaraDir);
console.log("============================================================\n");
