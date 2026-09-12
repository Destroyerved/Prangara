-- ====================================================================
-- PRANGARA — Industrial Carbon Intelligence Network Database Schema
-- Problem Statement: HackOut'26 PS10
-- PostGIS & Full Provenance Enabled
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Source Registry Table
CREATE TABLE IF NOT EXISTS source_registry (
    source_id VARCHAR(64) PRIMARY KEY,
    agency VARCHAR(255) NOT NULL,
    dataset_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(64) NOT NULL,
    authority_class VARCHAR(64) NOT NULL,
    jurisdiction VARCHAR(128) NOT NULL,
    canonical_url TEXT NOT NULL,
    license VARCHAR(128),
    notes TEXT
);

-- 2. Verified Emission Factors Table
CREATE TABLE IF NOT EXISTS verified_emission_factors (
    factor_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    scope SMALLINT NOT NULL CHECK (scope IN (1, 2, 3)),
    base_factor NUMERIC(12, 4) NOT NULL,
    low_uncertainty NUMERIC(12, 4),
    high_uncertainty NUMERIC(12, 4),
    canonical_unit VARCHAR(64) NOT NULL,
    gas_basis VARCHAR(32) DEFAULT 'CO2e',
    geography VARCHAR(128) NOT NULL,
    proxy_for_india BOOLEAN NOT NULL DEFAULT FALSE,
    system_boundary VARCHAR(128) NOT NULL,
    data_vintage_year INTEGER,
    source_id VARCHAR(64) REFERENCES source_registry(source_id),
    source_record TEXT,
    conversion_applied BOOLEAN DEFAULT FALSE,
    conversion_formula TEXT,
    quality_grade VARCHAR(32) DEFAULT 'HIGH',
    verification_status VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sector Energy Benchmarks Table
CREATE TABLE IF NOT EXISTS sector_benchmarks (
    benchmark_id VARCHAR(64) PRIMARY KEY,
    sector_key VARCHAR(64) NOT NULL,
    sector_name VARCHAR(255) NOT NULL,
    primary_clusters TEXT NOT NULL,
    range_low_thermal_gj_t NUMERIC(8, 2),
    range_high_thermal_gj_t NUMERIC(8, 2),
    median_thermal_gj_t NUMERIC(8, 2),
    range_low_elec_kwh_t NUMERIC(8, 2),
    range_high_elec_kwh_t NUMERIC(8, 2),
    median_elec_kwh_t NUMERIC(8, 2),
    carbon_intensity_tco2e_t NUMERIC(8, 4),
    benchmark_type VARCHAR(64) NOT NULL DEFAULT 'reported_range',
    source_id VARCHAR(64) REFERENCES source_registry(source_id),
    verification_status VARCHAR(64) NOT NULL
);

-- 4. Circular Interventions Library Table
CREATE TABLE IF NOT EXISTS circular_interventions (
    intervention_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    target_stream VARCHAR(128) NOT NULL,
    abatement_low_pct NUMERIC(6, 2),
    abatement_base_pct NUMERIC(6, 2) NOT NULL,
    abatement_high_pct NUMERIC(6, 2),
    abatement_unit VARCHAR(64) NOT NULL,
    capex_inr NUMERIC(14, 2) NOT NULL,
    savings_model TEXT NOT NULL,
    payback_months INTEGER NOT NULL,
    lifetime_years INTEGER NOT NULL,
    difficulty SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
    technology TEXT,
    dpr_source VARCHAR(128) NOT NULL,
    verification_status VARCHAR(64) NOT NULL
);

-- 5. Raw Material Marketplace Table
CREATE TABLE IF NOT EXISTS raw_material_marketplace (
    listing_id VARCHAR(64) PRIMARY KEY,
    supplier_id VARCHAR(64) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    grade VARCHAR(128),
    recycled_content_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
    price_per_t_inr NUMERIC(12, 2) NOT NULL,
    moq_tonnes NUMERIC(10, 2) NOT NULL,
    available_stock_tonnes NUMERIC(10, 2) NOT NULL,
    warehouse_location VARCHAR(255) NOT NULL,
    verified_carbon_factor_id VARCHAR(64) REFERENCES verified_emission_factors(factor_id),
    verified_factor_value NUMERIC(10, 4) NOT NULL,
    verified_unit VARCHAR(64) NOT NULL,
    data_mode VARCHAR(64) NOT NULL DEFAULT 'FIRST_PARTY_OPERATOR_REPORTED',
    valid_until DATE NOT NULL
);
