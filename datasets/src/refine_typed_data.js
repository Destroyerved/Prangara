const fs = require('fs');
const path = require('path');

const cleanDir = path.join(__dirname, '../../data/clean');
const refinedDir = path.join(__dirname, '../../data/refined');
const csvDir = path.join(refinedDir, 'csv');
const jsonDir = path.join(refinedDir, 'json');
const sqlDir = path.join(refinedDir, 'sql');

[csvDir, jsonDir, sqlDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Load clean data
const factorsData = JSON.parse(fs.readFileSync(path.join(cleanDir, 'emission_factors_verified.json'), 'utf8')).factors;
const interventionsData = JSON.parse(fs.readFileSync(path.join(cleanDir, 'interventions_verified.json'), 'utf8'));
const sectorsData = JSON.parse(fs.readFileSync(path.join(cleanDir, 'sectors_verified.json'), 'utf8')).sectors;

console.log("Processing clean reference data into strictly typed formats (JSON, CSV, SQL DDL & Seed)...");

// ==========================================
// 1. REFINED JSON (Strict Typed Records)
// ==========================================
const refinedFactors = Object.keys(factorsData).map(k => {
  const f = factorsData[k];
  return {
    factor_key: String(f.key),
    factor_group: String(f.group),
    display_name: String(f.display_name),
    emission_factor_value: Number(Number(f.value).toFixed(4)),
    uncertainty_low: f.low !== null ? Number(Number(f.low).toFixed(4)) : null,
    uncertainty_high: f.high !== null ? Number(Number(f.high).toFixed(4)) : null,
    canonical_unit: String(f.unit),
    scope: Number(f.scope),
    gas_basis: String(f.gas_basis),
    geography: String(f.geography),
    system_boundary: String(f.boundary),
    data_vintage_year: String(f.data_year),
    source_id: String(f.source_id),
    conversion_applied: Boolean(f.conversion_applied),
    proxy_for_india: Boolean(f.proxy_for_india),
    confidence_rating: String(f.confidence),
    verification_status: String(f.verification_status),
    verified_at_utc: String(f.verified_at)
  };
});

const refinedInterventions = interventionsData.map(i => {
  return {
    intervention_id: String(i.id),
    intervention_name: String(i.name),
    category: String(i.category),
    target_stream: String(i.target_stream),
    abatement_low_fraction: Number(Number(i.abatement.low).toFixed(4)),
    abatement_base_fraction: Number(Number(i.abatement.base).toFixed(4)),
    abatement_high_fraction: Number(Number(i.abatement.high).toFixed(4)),
    abatement_unit: String(i.abatement.unit),
    abatement_source_id: String(i.abatement.source_id),
    capex_basis: String(i.economics.capex_basis),
    capex_inr: i.economics.capex_value !== null ? Number(i.economics.capex_value) : null,
    savings_model: String(i.economics.savings_model),
    asset_lifetime_years: Number(i.economics.lifetime_years),
    max_substitution_fraction: i.constraints.max_substitution_pct !== null ? Number(Number(i.constraints.max_substitution_pct).toFixed(2)) : null,
    blocked_sectors: i.constraints.blocked_sectors || [],
    sector_caps: i.constraints.sector_caps || {},
    difficulty_score_1_to_5: Number(i.difficulty),
    disruption_downtime_days: Number(i.disruption_days),
    confidence_tier: String(i.confidence),
    planning_grade_capex: Boolean(i.economics.planning_grade),
    actual_vendor_quote_required: Boolean(i.actual_quote_required)
  };
});

const refinedSectors = sectorsData.map(s => {
  return {
    sector_key: String(s.sector_key),
    sector_name: String(s.sector_name),
    primary_clusters: s.clusters.map(c => `${c.name} (${c.state})`).join('; '),
    cluster_count: Number(s.clusters.length),
    electricity_sec_low_kwh_per_t: Number(s.benchmarks.electricity_kwh_per_t.low),
    electricity_sec_median_kwh_per_t: Number(s.benchmarks.electricity_kwh_per_t.median),
    electricity_sec_high_kwh_per_t: Number(s.benchmarks.electricity_kwh_per_t.high),
    thermal_sec_low_gj_per_t: Number(s.benchmarks.thermal_gj_per_t.low),
    thermal_sec_median_gj_per_t: Number(s.benchmarks.thermal_gj_per_t.median),
    thermal_sec_high_gj_per_t: Number(s.benchmarks.thermal_gj_per_t.high),
    gate_to_gate_carbon_low_tco2e_per_t: Number(s.benchmarks.gate_to_gate_tco2e_per_t.low),
    gate_to_gate_carbon_median_tco2e_per_t: Number(s.benchmarks.gate_to_gate_tco2e_per_t.median),
    gate_to_gate_carbon_high_tco2e_per_t: Number(s.benchmarks.gate_to_gate_tco2e_per_t.high),
    benchmark_status: String(s.benchmarks.electricity_kwh_per_t.status),
    regulatory_flags_count: Number(s.regulatory_flags.length),
    regulatory_flags_list: s.regulatory_flags.join('; '),
    demo_company_name: String(s.demo_profile.company_name),
    demo_annual_output_tonnes: Number(s.demo_profile.annual_output_t),
    demo_revenue_inr_crores: Number(s.demo_profile.revenue_cr),
    demo_reported_footprint_tco2e: Number(s.demo_profile.reported_footprint_tco2e),
    demo_is_synthetic: Boolean(s.demo_profile.synthetic)
  };
});

fs.writeFileSync(path.join(jsonDir, 'chakra_emission_factors_refined.json'), JSON.stringify(refinedFactors, null, 2));
fs.writeFileSync(path.join(jsonDir, 'chakra_interventions_refined.json'), JSON.stringify(refinedInterventions, null, 2));
fs.writeFileSync(path.join(jsonDir, 'chakra_sectors_refined.json'), JSON.stringify(refinedSectors, null, 2));

// ==========================================
// 2. REFINED CSV (Tabular Typed Export)
// ==========================================
function convertToCSV(array) {
  if (!array || array.length === 0) return '';
  const headers = Object.keys(array[0]);
  const rows = array.map(row => {
    return headers.map(header => {
      let val = row[header];
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      if (typeof val === 'string') {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val === null ? '' : val;
    }).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

fs.writeFileSync(path.join(csvDir, 'chakra_emission_factors_refined.csv'), convertToCSV(refinedFactors));
fs.writeFileSync(path.join(csvDir, 'chakra_interventions_refined.csv'), convertToCSV(refinedInterventions));
fs.writeFileSync(path.join(csvDir, 'chakra_sectors_refined.csv'), convertToCSV(refinedSectors));

// ==========================================
// 3. SQL SCHEMA DDL & SEED DATA (Typed PostGIS / ANSI SQL)
// ==========================================
let schemaSql = `-- =========================================================================
-- Chakra PS10 — Verified Decarbonization & Reference Database Typed Schema
-- Dialect: ANSI SQL / PostgreSQL compliant
-- =========================================================================

CREATE TABLE IF NOT EXISTS chakra_emission_factors (
    factor_key VARCHAR(64) PRIMARY KEY,
    factor_group VARCHAR(32) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    emission_factor_value NUMERIC(12, 4) NOT NULL,
    uncertainty_low NUMERIC(12, 4),
    uncertainty_high NUMERIC(12, 4),
    canonical_unit VARCHAR(32) NOT NULL,
    scope SMALLINT NOT NULL CHECK (scope IN (1, 2, 3)),
    gas_basis VARCHAR(128) NOT NULL,
    geography VARCHAR(128) NOT NULL,
    system_boundary VARCHAR(128) NOT NULL,
    data_vintage_year VARCHAR(32) NOT NULL,
    source_id VARCHAR(64) NOT NULL,
    conversion_applied BOOLEAN NOT NULL DEFAULT FALSE,
    proxy_for_india BOOLEAN NOT NULL DEFAULT FALSE,
    confidence_rating VARCHAR(16) NOT NULL CHECK (confidence_rating IN ('HIGH', 'MEDIUM', 'LOW')),
    verification_status VARCHAR(64) NOT NULL,
    verified_at_utc TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_uncertainty_bounds CHECK (uncertainty_low IS NULL OR uncertainty_high IS NULL OR (uncertainty_low <= emission_factor_value AND emission_factor_value <= uncertainty_high))
);

CREATE TABLE IF NOT EXISTS chakra_interventions (
    intervention_id VARCHAR(32) PRIMARY KEY,
    intervention_name VARCHAR(255) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('energy', 'material', 'process', 'waste', 'logistics')),
    target_stream VARCHAR(64) NOT NULL,
    abatement_low_fraction NUMERIC(6, 4) NOT NULL,
    abatement_base_fraction NUMERIC(6, 4) NOT NULL,
    abatement_high_fraction NUMERIC(6, 4) NOT NULL,
    abatement_unit VARCHAR(32) NOT NULL,
    abatement_source_id VARCHAR(64) NOT NULL,
    capex_basis VARCHAR(64) NOT NULL,
    capex_inr NUMERIC(14, 2),
    savings_model VARCHAR(32) NOT NULL CHECK (savings_model IN ('avoided_purchase', 'tariff_delta', 'fuel_switch', 'price_delta', 'none')),
    asset_lifetime_years INTEGER NOT NULL CHECK (asset_lifetime_years > 0),
    max_substitution_fraction NUMERIC(4, 2) CHECK (max_substitution_fraction BETWEEN 0.0 AND 1.0),
    difficulty_score_1_to_5 SMALLINT NOT NULL CHECK (difficulty_score_1_to_5 BETWEEN 1 AND 5),
    disruption_downtime_days INTEGER NOT NULL DEFAULT 0,
    confidence_tier VARCHAR(16) NOT NULL,
    planning_grade_capex BOOLEAN NOT NULL DEFAULT TRUE,
    actual_vendor_quote_required BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS chakra_sectors (
    sector_key VARCHAR(64) PRIMARY KEY,
    sector_name VARCHAR(255) NOT NULL,
    primary_clusters TEXT NOT NULL,
    cluster_count INTEGER NOT NULL,
    electricity_sec_low_kwh_per_t NUMERIC(10, 2) NOT NULL,
    electricity_sec_median_kwh_per_t NUMERIC(10, 2) NOT NULL,
    electricity_sec_high_kwh_per_t NUMERIC(10, 2) NOT NULL,
    thermal_sec_low_gj_per_t NUMERIC(10, 2) NOT NULL,
    thermal_sec_median_gj_per_t NUMERIC(10, 2) NOT NULL,
    thermal_sec_high_gj_per_t NUMERIC(10, 2) NOT NULL,
    gate_to_gate_carbon_low_tco2e_per_t NUMERIC(10, 2) NOT NULL,
    gate_to_gate_carbon_median_tco2e_per_t NUMERIC(10, 2) NOT NULL,
    gate_to_gate_carbon_high_tco2e_per_t NUMERIC(10, 2) NOT NULL,
    benchmark_status VARCHAR(64) NOT NULL,
    regulatory_flags_count INTEGER NOT NULL DEFAULT 0,
    regulatory_flags_list TEXT,
    demo_company_name VARCHAR(255) NOT NULL,
    demo_annual_output_tonnes NUMERIC(12, 2) NOT NULL,
    demo_revenue_inr_crores NUMERIC(10, 2) NOT NULL,
    demo_reported_footprint_tco2e NUMERIC(12, 2) NOT NULL,
    demo_is_synthetic BOOLEAN NOT NULL DEFAULT TRUE
);
`;

let seedSql = `-- =========================================================================
-- Chakra PS10 — Seed Data for Verified Reference Database
-- =========================================================================

`;

refinedFactors.forEach(f => {
  seedSql += `INSERT INTO chakra_emission_factors (factor_key, factor_group, display_name, emission_factor_value, uncertainty_low, uncertainty_high, canonical_unit, scope, gas_basis, geography, system_boundary, data_vintage_year, source_id, conversion_applied, proxy_for_india, confidence_rating, verification_status) VALUES ('${f.factor_key}', '${f.factor_group}', '${f.display_name.replace(/'/g, "''")}', ${f.emission_factor_value}, ${f.uncertainty_low}, ${f.uncertainty_high}, '${f.canonical_unit}', ${f.scope}, '${f.gas_basis}', '${f.geography}', '${f.system_boundary}', '${f.data_vintage_year}', '${f.source_id}', ${f.conversion_applied ? 'TRUE' : 'FALSE'}, ${f.proxy_for_india ? 'TRUE' : 'FALSE'}, '${f.confidence_rating}', '${f.verification_status}') ON CONFLICT (factor_key) DO UPDATE SET emission_factor_value = EXCLUDED.emission_factor_value;\n`;
});

seedSql += `\n`;
refinedInterventions.forEach(i => {
  seedSql += `INSERT INTO chakra_interventions (intervention_id, intervention_name, category, target_stream, abatement_low_fraction, abatement_base_fraction, abatement_high_fraction, abatement_unit, abatement_source_id, capex_basis, capex_inr, savings_model, asset_lifetime_years, max_substitution_fraction, difficulty_score_1_to_5, disruption_downtime_days, confidence_tier, planning_grade_capex, actual_vendor_quote_required) VALUES ('${i.intervention_id}', '${i.intervention_name.replace(/'/g, "''")}', '${i.category}', '${i.target_stream}', ${i.abatement_low_fraction}, ${i.abatement_base_fraction}, ${i.abatement_high_fraction}, '${i.abatement_unit}', '${i.abatement_source_id}', '${i.capex_basis}', ${i.capex_inr || 'NULL'}, '${i.savings_model}', ${i.asset_lifetime_years}, ${i.max_substitution_fraction || 'NULL'}, ${i.difficulty_score_1_to_5}, ${i.disruption_downtime_days}, '${i.confidence_tier}', ${i.planning_grade_capex ? 'TRUE' : 'FALSE'}, ${i.actual_vendor_quote_required ? 'TRUE' : 'FALSE'}) ON CONFLICT (intervention_id) DO UPDATE SET abatement_base_fraction = EXCLUDED.abatement_base_fraction;\n`;
});

seedSql += `\n`;
refinedSectors.forEach(s => {
  seedSql += `INSERT INTO chakra_sectors (sector_key, sector_name, primary_clusters, cluster_count, electricity_sec_low_kwh_per_t, electricity_sec_median_kwh_per_t, electricity_sec_high_kwh_per_t, thermal_sec_low_gj_per_t, thermal_sec_median_gj_per_t, thermal_sec_high_gj_per_t, gate_to_gate_carbon_low_tco2e_per_t, gate_to_gate_carbon_median_tco2e_per_t, gate_to_gate_carbon_high_tco2e_per_t, benchmark_status, regulatory_flags_count, regulatory_flags_list, demo_company_name, demo_annual_output_tonnes, demo_revenue_inr_crores, demo_reported_footprint_tco2e, demo_is_synthetic) VALUES ('${s.sector_key}', '${s.sector_name.replace(/'/g, "''")}', '${s.primary_clusters.replace(/'/g, "''")}', ${s.cluster_count}, ${s.electricity_sec_low_kwh_per_t}, ${s.electricity_sec_median_kwh_per_t}, ${s.electricity_sec_high_kwh_per_t}, ${s.thermal_sec_low_gj_per_t}, ${s.thermal_sec_median_gj_per_t}, ${s.thermal_sec_high_gj_per_t}, ${s.gate_to_gate_carbon_low_tco2e_per_t}, ${s.gate_to_gate_carbon_median_tco2e_per_t}, ${s.gate_to_gate_carbon_high_tco2e_per_t}, '${s.benchmark_status}', ${s.regulatory_flags_count}, '${s.regulatory_flags_list.replace(/'/g, "''")}', '${s.demo_company_name.replace(/'/g, "''")}', ${s.demo_annual_output_tonnes}, ${s.demo_revenue_inr_crores}, ${s.demo_reported_footprint_tco2e}, ${s.demo_is_synthetic ? 'TRUE' : 'FALSE'}) ON CONFLICT (sector_key) DO UPDATE SET demo_reported_footprint_tco2e = EXCLUDED.demo_reported_footprint_tco2e;\n`;
});

fs.writeFileSync(path.join(sqlDir, 'chakra_schema.sql'), schemaSql);
fs.writeFileSync(path.join(sqlDir, 'chakra_seed_data.sql'), seedSql);

// ==========================================
// 4. UPDATE TYPE DICTIONARY
// ==========================================
const dictPath = path.join(refinedDir, 'type_dictionary.json');
let typeDict = {};
if (fs.existsSync(dictPath)) {
  typeDict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
}

typeDict.datasets = typeDict.datasets || {};

typeDict.datasets.chakra_emission_factors = {
  factor_key: { type: "VARCHAR(64)", primary_key: true, nullable: false },
  factor_group: { type: "ENUM(electricity, fuels, materials, logistics, waste)", nullable: false },
  display_name: { type: "VARCHAR(255)", nullable: false },
  emission_factor_value: { type: "NUMERIC(12,4)", nullable: false },
  uncertainty_low: { type: "NUMERIC(12,4)", nullable: true },
  uncertainty_high: { type: "NUMERIC(12,4)", nullable: true },
  canonical_unit: { type: "ENUM(tCO2e/MWh, kgCO2e/litre, kgCO2e/Sm3, kgCO2e/kg, tCO2e/t, kgCO2e/t-km)", nullable: false },
  scope: { type: "SMALLINT", min: 1, max: 3, nullable: false },
  gas_basis: { type: "VARCHAR(128)", nullable: false },
  geography: { type: "VARCHAR(128)", nullable: false },
  system_boundary: { type: "VARCHAR(128)", nullable: false },
  source_id: { type: "VARCHAR(64)", foreign_key: "source_registry.source_id", nullable: false },
  conversion_applied: { type: "BOOLEAN", nullable: false },
  verification_status: { type: "ENUM(VERIFIED_OFFICIAL, VERIFIED_INDUSTRY_LCI, VERIFIED_METHODOLOGY, DERIVED_TRANSPARENT, SCREENING_ONLY)", nullable: false }
};

typeDict.datasets.chakra_interventions = {
  intervention_id: { type: "VARCHAR(32)", primary_key: true, nullable: false },
  intervention_name: { type: "VARCHAR(255)", nullable: false },
  category: { type: "ENUM(energy, material, process, waste, logistics)", nullable: false },
  target_stream: { type: "VARCHAR(64)", nullable: false },
  abatement_low_fraction: { type: "NUMERIC(6,4)", min: 0.0, max: 1.0, nullable: false },
  abatement_base_fraction: { type: "NUMERIC(6,4)", min: 0.0, max: 1.0, nullable: false },
  abatement_high_fraction: { type: "NUMERIC(6,4)", min: 0.0, max: 1.0, nullable: false },
  capex_basis: { type: "VARCHAR(64)", nullable: false },
  capex_inr: { type: "NUMERIC(14,2)", unit: "INR", nullable: true },
  savings_model: { type: "ENUM(avoided_purchase, tariff_delta, fuel_switch, price_delta, none)", nullable: false },
  asset_lifetime_years: { type: "INTEGER", min: 1, max: 30, nullable: false },
  max_substitution_fraction: { type: "NUMERIC(4,2)", min: 0.0, max: 1.0, nullable: true },
  difficulty_score_1_to_5: { type: "SMALLINT", min: 1, max: 5, nullable: false },
  disruption_downtime_days: { type: "INTEGER", min: 0, nullable: false },
  planning_grade_capex: { type: "BOOLEAN", default: true, nullable: false }
};

typeDict.datasets.chakra_sectors = {
  sector_key: { type: "VARCHAR(64)", primary_key: true, nullable: false },
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
};

fs.writeFileSync(dictPath, JSON.stringify(typeDict, null, 2));

console.log("Refining complete!");
console.log("- Refined JSON files written to data/refined/json/");
console.log("- Refined CSV files written to data/refined/csv/");
console.log("- Refined SQL Schema & Seed written to data/refined/sql/");
console.log("- Updated data/refined/type_dictionary.json with Chakra typed definitions.");
