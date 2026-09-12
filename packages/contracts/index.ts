/**
 * PRANGARA Shared Contracts & Data Transfer Objects (DTOs)
 * Strict schema definitions shared across Frontend (apps/web, apps/mobile)
 * and Backend (backend/app, backend/engine, backend/ml).
 * 
 * Rules:
 * 1. Zero field name collisions.
 * 2. Carbon emissions always carry uncertainty bands [low, base, high] in tCO2e.
 * 3. Monetary values always state currency (INR / EUR) and scale.
 */

export type Role = 'ADMIN' | 'MANUFACTURER' | 'PROVIDER' | 'AUDITOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organization_id: string;
  created_at: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  latitude: number;
  longitude: number;
}

export interface Factory {
  id: string;
  organization_id: string;
  factory_name: string;
  sector_key: string;
  sites: Site[];
  created_at: string;
}

export interface PlantProfile {
  company_name: string;
  plant_name: string;
  sector_key: string;
  state: string;
  annual_production_tonnes: number;
  production_unit?: string;
  annual_turnover_inr_cr?: number;
  operating_hours_per_year?: number;
  electricity_kwh?: number;
  fossil_fuels?: Array<{
    fuel_key: string;
    annual_quantity: number;
    unit: string;
  }>;
  raw_materials?: Array<{
    material_key: string;
    annual_tonnes: number;
  }>;
  outbound_freight?: {
    destination_name: string;
    mode: string;
    distance_km: number;
    annual_tonnes: number;
  };
}

export interface UncertaintyBand {
  low: number;
  base: number;
  high: number;
  unit: string;
}

export interface ActivityRecord {
  id: string;
  factory_id: string;
  activity_type: 'ELECTRICITY' | 'FUEL_COMBUSTION' | 'RAW_MATERIAL' | 'FREIGHT' | 'WATER' | 'WASTE';
  period_start: string;
  period_end: string;
  quantity: number;
  unit: string;
  evidence_ids: string[];
  data_quality_tier: 'TIER_1_MEASURED' | 'TIER_2_HYBRID' | 'TIER_3_ESTIMATED';
}

export interface Asset {
  id: string;
  factory_id: string;
  name: string;
  category: 'BOILER' | 'COMPRESSOR' | 'MOTOR' | 'KILN' | 'FURNACE' | 'SOLAR_ROOFTOP' | 'EFFLUENT_PLANT';
  rated_power_kw?: number;
  efficiency_rating?: string; // e.g. IE2, IE3, IE4
  operating_hours_daily?: number;
  year_of_installation?: number;
}

export interface Evidence {
  id: string;
  factory_id: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  sha256_hash: string;
  document_type: 'ELECTRICITY_BILL' | 'FUEL_INVOICE' | 'MATERIAL_INVOICE' | 'NAMEPLATE_PHOTO' | 'LAB_TEST';
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploaded_at: string;
}

export interface Stream {
  stream_key: string;
  stream_name: string;
  scope: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';
  category: string;
  emissions_tco2e: UncertaintyBand;
  share_of_total_pct: number;
  specific_intensity_per_tonne: number;
  factor_citation: {
    source_id: string;
    factor_name: string;
    factor_value: number;
    unit: string;
  };
}

export interface ScopeSummary {
  scope_1: UncertaintyBand;
  scope_2: UncertaintyBand;
  scope_3: UncertaintyBand;
  total: UncertaintyBand;
  scope_split_pct: {
    scope_1: number;
    scope_2: number;
    scope_3: number;
  };
}

export interface Leak {
  stream_key: string;
  stream_name: string;
  rule: 'benchmark_breach' | 'material_concentration' | 'structural_hotspot';
  severity: 'critical' | 'high' | 'medium' | 'low';
  measured_intensity: number;
  peer_p50: number;
  peer_p75: number;
  peer_percentile: number;
  recoverable_tonnes_to_median: number;
  potential_annual_savings_inr: number;
  explanation: string;
}

export interface Recommendation {
  intervention_id: string;
  intervention_name: string;
  target_stream_key: string;
  scope: string;
  abatement_tonnes_yr: number;
  capex_inr: number;
  annual_savings_inr: number;
  lcoa_inr_per_tonne: number;
  simple_payback_months: number;
  npv_10yr_inr: number;
  circular_strategy: 'CIRCULAR_INPUTS' | 'RESOURCE_RECOVERY' | 'ENERGY_EFFICIENCY' | 'LOGISTICS_OPTIMIZATION';
  status: 'ELIGIBLE' | 'BLOCKED' | 'CAPPED';
  status_reason?: string;
  cap_percentage?: number;
}

export interface Portfolio {
  mode: 'MAX_CARBON' | 'MAX_SAVINGS' | 'FAST_PAYBACK' | 'PARETO_BALANCED';
  capex_budget_inr: number;
  total_capex_inr: number;
  total_abatement_tco2e_yr: number;
  abatement_pct_of_footprint: number;
  annual_savings_inr: number;
  blended_payback_months: number;
  npv_10yr_inr: number;
  selected_interventions: Recommendation[];
}

export interface Scenario {
  id: string;
  name: string;
  baseline_assessment_id: string;
  modifications: Partial<PlantProfile>;
  projected_footprint_tco2e: UncertaintyBand;
  delta_tco2e: number;
  delta_pct: number;
  created_at: string;
}

export interface Provider {
  id: string;
  name: string;
  cluster: string;
  specialization: string[];
  carbon_trust_score: number;
  projects_completed: number;
  verified_savings_tco2e: number;
  contact_email: string;
  verification_tier: 'ACCREDITED_ESCO' | 'CIRCULAR_SUPPLIER' | 'COMMUNITY_PARTNER';
}

export interface RFQ {
  id: string;
  factory_id: string;
  intervention_id: string;
  target_stream_key: string;
  expected_abatement_tonnes: number;
  budget_cap_inr: number;
  status: 'OPEN' | 'QUOTED' | 'ACCEPTED' | 'CLOSED';
  created_at: string;
}

export interface Quote {
  id: string;
  rfq_id: string;
  provider_id: string;
  proposed_capex_inr: number;
  guaranteed_abatement_tonnes: number;
  annual_savings_inr: number;
  payback_months: number;
  warranty_years: number;
  status: 'SUBMITTED' | 'ACCEPTED' | 'DECLINED';
}

export interface RouteOption {
  preset: 'Fastest' | 'Cheapest' | 'Lowest Carbon' | 'Balanced';
  distance_km: number;
  transit_hours: number;
  fuel_litres: number;
  emissions_tco2e: number;
  freight_cost_inr: number;
  composite_score: number;
}

export interface Shipment {
  id: string;
  origin_name: string;
  origin_gps: [number, number];
  destination_name: string;
  dest_gps: [number, number];
  payload_tonnes: number;
  material_type: string;
  status: 'PENDING' | 'POOLED' | 'IN_TRANSIT' | 'DELIVERED';
}

export interface ComplianceCase {
  regime: 'EU_CBAM' | 'INDIA_CCTS' | 'SEBI_BRSR_CORE';
  status: 'ACTION_REQUIRED' | 'AUDIT_READY' | 'EXEMPT';
  risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  headline: string;
  financial_exposure_inr: number;
  required_disclosures: string[];
  missing_evidence: string[];
  statutory_deadline: string;
  statutory_reference: string;
  sha256_citation: string;
}

export interface RAGAnswer {
  query: string;
  answer_text: string;
  confidence_score: number;
  citations: Array<{
    source_id: string;
    document_title: string;
    publisher: string;
    section: string;
    page: number;
    sha256_checksum: string;
    direct_quote: string;
  }>;
}

export interface Event {
  id: string;
  event_type: 'ASSESSMENT_COMPLETED' | 'LEAK_DETECTED' | 'COMPLIANCE_BREACH' | 'RFQ_CREATED' | 'QUOTE_RECEIVED' | 'SHIPMENT_POOLED';
  payload: Record<string, any>;
  timestamp: string;
}

export interface AssessmentRequest {
  plant_profile: PlantProfile;
  optimization_constraints?: {
    max_capex_inr?: number;
    max_payback_months?: number;
    target_abatement_pct?: number;
  };
}

export interface AssessmentResponse {
  assessment_id: string;
  plant_name: string;
  sector: {
    sector_key: string;
    sector_name: string;
  };
  footprint: ScopeSummary;
  streams: Stream[];
  leaks: Leak[];
  macc: {
    recommendations: Recommendation[];
    cash_positive_count: number;
    cash_positive_abatement_tco2e: number;
    cash_positive_capex_inr: number;
    cash_positive_annual_savings_inr: number;
    cash_positive_blended_payback_months: number;
    pareto_frontier?: Array<{
      budget_inr: number;
      abatement_tco2e_yr: number;
      annual_savings_inr: number;
      payback_months: number;
      interventions_count: number;
    }>;
  };
  sankey: {
    nodes: Array<{ id: string; name: string }>;
    links: Array<{ source: string; target: string; value: number }>;
  };
  compliance: {
    cases: ComplianceCase[];
  };
}

export interface RouteOption {
  preset: 'FASTEST' | 'CHEAPEST' | 'LOWEST_CARBON' | 'BALANCED';
  distance_km: number;
  transit_hours: number;
  cost_inr: number;
  emissions_kgco2e: number;
  vehicle: string;
  description: string;
  carbon_reduction_pct?: number;
}

export interface RoutePlanResult {
  origin_gps: [number, number];
  destination_gps: [number, number];
  payload_tonnes: number;
  routes: {
    fastest: RouteOption;
    cheapest: RouteOption;
    lowest_carbon: RouteOption;
    balanced: RouteOption;
  };
}

export interface Shipment {
  id: string;
  factory_id?: string;
  organization_id?: string;
  origin_name: string;
  origin_lat: number;
  origin_lon: number;
  destination_name: string;
  dest_lat: number;
  dest_lon: number;
  payload_tonnes: number;
  cargo_type: string;
  status: 'PENDING' | 'POOLED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  pooled_run_id?: string;
  distance_km?: number;
  transit_hours?: number;
  cost_inr?: number;
  emissions_kgco2e?: number;
  client_ref?: string;
  created_at: string;
}

export interface PooledRun {
  run_id: string;
  shipment_count: number;
  shipment_ids: string[];
  total_payload_tonnes: number;
  utilization_capacity_pct: number;
  total_distance_km: number;
  destinations_routed: string[];
  freight_carbon_kgco2e: number;
  total_cost_inr: number;
  carrier_assigned: string;
}

export interface PoolingMatchResult {
  status: string;
  algorithm: string;
  total_shipments_evaluated: number;
  trucks_dispatched_before: number;
  trucks_dispatched_after: number;
  truck_count_reduction_pct: number;
  pooled_runs: PooledRun[];
  standalone_summary: {
    total_distance_km: number;
    total_freight_carbon_tco2e: number;
    total_freight_cost_inr: number;
  };
  pooled_summary: {
    total_distance_km: number;
    total_freight_carbon_tco2e: number;
    total_freight_cost_inr: number;
  };
  net_savings: {
    carbon_saved_tco2e: number;
    carbon_reduction_pct: number;
    cost_saved_inr: number;
    cost_savings_pct: number;
  };
}

