-- =========================================================================
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
