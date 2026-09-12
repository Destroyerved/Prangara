-- ====================================================================
-- PRANGARA: Industrial Decarbonization Intelligence Network
-- PostGIS & Full Provenance Enabled Database Schema (PostgreSQL 14+)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Source Registry
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

-- 2. Verified Emission Factors
CREATE TABLE IF NOT EXISTS verified_emission_factors (
    factor_key VARCHAR(64) PRIMARY KEY,
    factor_group VARCHAR(64) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    emission_factor_value NUMERIC(12, 4) NOT NULL,
    uncertainty_low NUMERIC(12, 4),
    uncertainty_high NUMERIC(12, 4),
    canonical_unit VARCHAR(64) NOT NULL,
    scope SMALLINT NOT NULL CHECK (scope IN (1, 2, 3)),
    gas_basis VARCHAR(128) NOT NULL,
    geography VARCHAR(128) NOT NULL,
    system_boundary VARCHAR(128) NOT NULL,
    data_vintage_year VARCHAR(32),
    source_id VARCHAR(64) REFERENCES source_registry(source_id),
    conversion_applied BOOLEAN DEFAULT FALSE,
    proxy_for_india BOOLEAN DEFAULT FALSE,
    confidence_rating VARCHAR(32) DEFAULT 'HIGH',
    verification_status VARCHAR(64) NOT NULL,
    verified_at_utc TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sectors & Benchmarks
CREATE TABLE IF NOT EXISTS sectors (
    sector_key VARCHAR(64) PRIMARY KEY,
    sector_name VARCHAR(255) NOT NULL,
    primary_clusters TEXT NOT NULL,
    cluster_count INTEGER NOT NULL,
    electricity_sec_median_kwh_per_t NUMERIC(10, 2) NOT NULL,
    thermal_sec_median_gj_per_t NUMERIC(10, 2) NOT NULL,
    gate_to_gate_carbon_median_tco2e_per_t NUMERIC(10, 2) NOT NULL,
    benchmark_status VARCHAR(64) NOT NULL DEFAULT 'VERIFIED_OFFICIAL_SCREENING',
    demo_company_name VARCHAR(255) NOT NULL,
    demo_annual_output_tonnes NUMERIC(12, 2) NOT NULL,
    demo_reported_footprint_tco2e NUMERIC(12, 2) NOT NULL,
    demo_is_synthetic BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Circular & Energy Interventions Library
CREATE TABLE IF NOT EXISTS circular_interventions (
    intervention_id VARCHAR(32) PRIMARY KEY,
    intervention_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    target_stream VARCHAR(64) NOT NULL,
    abatement_low_fraction NUMERIC(6, 4) NOT NULL,
    abatement_base_fraction NUMERIC(6, 4) NOT NULL,
    abatement_high_fraction NUMERIC(6, 4) NOT NULL,
    abatement_unit VARCHAR(64) NOT NULL,
    abatement_source_id VARCHAR(64) REFERENCES source_registry(source_id),
    capex_basis VARCHAR(64) NOT NULL,
    capex_inr NUMERIC(14, 2),
    savings_model VARCHAR(64) NOT NULL,
    asset_lifetime_years INTEGER NOT NULL,
    max_substitution_fraction NUMERIC(4, 2),
    difficulty_score_1_to_5 SMALLINT CHECK (difficulty_score_1_to_5 BETWEEN 1 AND 5),
    disruption_downtime_days INTEGER NOT NULL DEFAULT 0,
    confidence_tier VARCHAR(64) NOT NULL,
    planning_grade_capex BOOLEAN NOT NULL DEFAULT TRUE,
    actual_vendor_quote_required BOOLEAN NOT NULL DEFAULT TRUE
);

-- 5. Raw Materials Marketplace Listings
CREATE TABLE IF NOT EXISTS raw_material_marketplace (
    listing_id VARCHAR(64) PRIMARY KEY,
    supplier_id VARCHAR(64) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    material_grade VARCHAR(128),
    recycled_content_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
    price_per_t_inr NUMERIC(12, 2) NOT NULL,
    moq_tonnes NUMERIC(10, 2) NOT NULL,
    available_stock_tonnes NUMERIC(10, 2) NOT NULL,
    warehouse_location VARCHAR(255) NOT NULL,
    verified_carbon_factor_id VARCHAR(64) REFERENCES verified_emission_factors(factor_key),
    verified_factor_value NUMERIC(10, 4) NOT NULL,
    verified_unit VARCHAR(64) NOT NULL,
    data_authenticity_mode VARCHAR(64) NOT NULL DEFAULT 'FIRST_PARTY_OPERATOR_REPORTED',
    valid_until DATE NOT NULL
);

-- 6. Accredited Energy Auditors & ESCOs
CREATE TABLE IF NOT EXISTS accredited_providers (
    provider_id VARCHAR(64) PRIMARY KEY,
    provider_type VARCHAR(64) NOT NULL,
    organization_name VARCHAR(255) NOT NULL,
    empanelment_grade VARCHAR(64) NOT NULL,
    valid_until_year INTEGER NOT NULL,
    headquarters_city VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL,
    accreditation_body VARCHAR(128) NOT NULL,
    verified_status VARCHAR(64) NOT NULL
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_factors_group ON verified_emission_factors(factor_group);
CREATE INDEX IF NOT EXISTS idx_factors_scope ON verified_emission_factors(scope);
CREATE INDEX IF NOT EXISTS idx_interventions_target ON circular_interventions(target_stream);
CREATE INDEX IF NOT EXISTS idx_interventions_cat ON circular_interventions(category);
CREATE INDEX IF NOT EXISTS idx_mkt_material ON raw_material_marketplace(material_name);
