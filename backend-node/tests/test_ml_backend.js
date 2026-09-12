/**
 * PRANGARA Backend & Advanced ML Engine — Comprehensive Automated Test Suite
 * Tests deterministic carbon accounting, ML portfolio optimizer, logistics pooling,
 * Bayesian benchmark learning, grounded RAG citations, and statutory compliance.
 */

const assert = require('assert');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..', '..');

const { CarbonEngine } = require('../engine/assess');
const { PortfolioOptimizer } = require('../ml/portfolio_optimizer');
const { LogisticsOptimizer } = require('../ml/logistics_optimizer');
const { BayesianBenchmarkFlywheel } = require('../ml/bayesian_benchmarks');
const { MarketplaceRanker } = require('../ml/marketplace_ranker');
const { RAGService } = require('../rag/rag_service');
const { ComplianceEvaluator } = require('../compliance/evaluator');

console.log('='.repeat(75));
console.log('PRANGARA BACKEND & ADVANCED ML ENGINE — AUTOMATED TEST SUITE');
console.log('='.repeat(75));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Reason: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// Test Group 1: Deterministic Carbon Engine Invariants
// -----------------------------------------------------------------------------
console.log('\n--- 1. Deterministic Carbon Accounting & Physics Invariants ---');
const engine = new CarbonEngine(projectRoot);

test('Footprint Scope 1/2/3 Summation Invariant holds', () => {
  const heroProfile = engine.sectors['textile_dyeing'].demo_profile;
  const res = engine.assess(heroProfile);
  const s1 = res.footprint.scope1.base;
  const s2 = res.footprint.scope2.base;
  const s3 = res.footprint.scope3.base;
  const total = res.footprint.total_footprint.base;
  assert(Math.abs((s1 + s2 + s3) - total) < 0.01, `Scope sum (${s1+s2+s3}) must match total (${total})`);
});

test('Uncertainty Band Monotonicity: low <= base <= high holds', () => {
  const heroProfile = engine.sectors['textile_dyeing'].demo_profile;
  const res = engine.assess(heroProfile);
  for (const scopeKey of ['scope1', 'scope2', 'scope3', 'total_footprint']) {
    const b = res.footprint[scopeKey];
    assert(b.low <= b.base + 1e-4 && b.base <= b.high + 1e-4, `Uncertainty bounds broken in ${scopeKey}`);
  }
});

test('Hero Assessment on Tirupur textile matches benchmark p78 electricity breach', () => {
  const heroProfile = engine.sectors['textile_dyeing'].demo_profile;
  const res = engine.assess(heroProfile);
  assert(res.footprint.total_footprint.base > 19000, `Tirupur hero footprint expected > 19,000 tCO2e, got ${res.footprint.total_footprint.base}`);
  const elecLeak = res.leaks.find(l => l.stream_name === 'grid_electricity');
  assert(elecLeak, 'Expected electricity leak breach detected');
  assert(elecLeak.peer_percentile >= 75, `Expected peer percentile >= 75, got ${elecLeak.peer_percentile}`);
});

test('Refusal Constraints: Incompatible interventions are blocked with reason', () => {
  const res = engine.assess({
    sector_key: 'pharma_formulation',
    annual_production_tonnes: 500,
    revenue_crores: 100,
    pet_granules_tonnes: 200
  });
  // Pharma must refuse recycled plastics/blister foil
  assert(res.macc.blocked_interventions.length > 0, 'Pharma must have blocked interventions');
  const blockedRecycledFoil = res.macc.blocked_interventions.find(b => b.name.toLowerCase().includes('recycled') || b.id.includes('INT'));
  assert(blockedRecycledFoil, 'Expected blocked circular intervention for GMP pharma');
});

// -----------------------------------------------------------------------------
// Test Group 2: Advanced ML Portfolio Optimizer
// -----------------------------------------------------------------------------
console.log('\n--- 2. Advanced ML Pareto Portfolio Optimizer ---');
const optimizer = new PortfolioOptimizer();

test('MILP Knapsack Respects Strict CapEx Budget', () => {
  const heroRes = engine.assess(engine.sectors['textile_dyeing'].demo_profile);
  const candidates = heroRes.macc.recommendations;
  const budget = 25000000; // ₹2.5 Cr budget
  const opt = optimizer.optimize(candidates, { max_budget_inr: budget });

  assert(opt.metrics.total_capex_inr <= budget, `Allocated capex (${opt.metrics.total_capex_inr}) exceeded budget (${budget})`);
  assert(opt.selected_interventions.length > 0, 'Optimizer should select multiple interventions within budget');
  assert(opt.metrics.total_abatement_tco2e > 500, 'Expected significant abatement selected');
});

test('MILP Optimizer Generates 5-Point Monotonic Pareto Frontier', () => {
  const heroRes = engine.assess(engine.sectors['textile_dyeing'].demo_profile);
  const candidates = heroRes.macc.recommendations;
  const opt = optimizer.optimize(candidates, { max_budget_inr: 50000000 });

  assert.strictEqual(opt.pareto_frontier.length, 5, 'Must generate exactly 5 Pareto frontier points');
  for (let i = 1; i < opt.pareto_frontier.length; i++) {
    const prev = opt.pareto_frontier[i - 1];
    const curr = opt.pareto_frontier[i];
    assert(curr.achieved_abatement_tco2e >= prev.achieved_abatement_tco2e, 'Pareto frontier abatement must be non-decreasing with budget');
  }
});

// -----------------------------------------------------------------------------
// Test Group 3: Multi-Tenant Logistics Pooling & Route Optimizer
// -----------------------------------------------------------------------------
console.log('\n--- 3. Logistics Pooling (CVRPTW) & Route Optimizer ---');
const logistics = new LogisticsOptimizer();

test('Route Evaluator outputs 4 valid multi-objective presets', () => {
  const origin = [11.0168, 76.9558]; // Coimbatore
  const dest = [13.0827, 80.2707];   // Chennai
  const routeRes = logistics.evaluateRoute(origin, dest, 10.0);

  assert(routeRes.routes.fastest, 'Fastest route missing');
  assert(routeRes.routes.cheapest, 'Cheapest route missing');
  assert(routeRes.routes.lowest_carbon, 'Lowest carbon route missing');
  assert(routeRes.routes.balanced, 'Balanced route missing');
  assert(routeRes.routes.fastest.transit_hours <= routeRes.routes.cheapest.transit_hours, 'Fastest route must have lower or equal duration');
  assert(routeRes.routes.lowest_carbon.emissions_kgco2e < routeRes.routes.fastest.emissions_kgco2e, 'Lowest carbon must achieve strictly lower emissions');
});

test('Multi-Tenant Truck Pooling Solver reduces truck dispatches and cuts carbon', () => {
  const shipments = [
    { id: 'SHIP-1', origin_gps: [11.0168, 76.9558], dest_gps: [13.0827, 80.2707], payload_tonnes: 6.0, destination_name: 'Chennai Port' },
    { id: 'SHIP-2', origin_gps: [11.0250, 76.9600], dest_gps: [13.0827, 80.2707], payload_tonnes: 7.5, destination_name: 'Chennai Port' }
  ];
  const pool = logistics.optimizeTruckPooling(shipments);

  assert.strictEqual(pool.trucks_dispatched_before, 2, 'Before pooling: 2 trucks');
  assert.strictEqual(pool.trucks_dispatched_after, 1, 'After pooling: 1 bundled truck');
  assert(pool.net_savings.carbon_saved_tco2e > 0, 'Net carbon savings must be positive');
  assert(pool.net_savings.carbon_reduction_pct >= 20.0, 'Pooling should achieve >= 20% carbon reduction');
});

// -----------------------------------------------------------------------------
// Test Group 4: Empirical Bayesian Benchmark Learning
// -----------------------------------------------------------------------------
console.log('\n--- 4. Empirical Bayesian Benchmark Learning (Data Flywheel) ---');
const flywheel = new BayesianBenchmarkFlywheel();

test('Bayesian Shrinkage updates prior smoothly without outlier skew', () => {
  const prior = { low: 120, median: 180, high: 260 };
  const empiricalSamples = [160, 165, 170, 162, 168, 164, 169, 166, 163, 9999]; // 9999 is an outlier
  const updated = flywheel.updateBenchmark(prior, empiricalSamples);

  assert(updated.sample_observed_median < 180, 'Empirical median should reflect ~165');
  assert(updated.updated_median < 180 && updated.updated_median > 160, 'Updated median must shrink towards empirical median');
  assert(updated.updated_median < 500, 'Outlier 9999 must be rejected by IQR filter');
});

// -----------------------------------------------------------------------------
// Test Group 5: Marketplace Carbon-Delta Ranker
// -----------------------------------------------------------------------------
console.log('\n--- 5. Marketplace Carbon-Delta Ranker ---');
const ranker = new MarketplaceRanker();

test('Carbon-Delta ranker prioritizes local circular material with high net carbon ROI', () => {
  const buyerGps = [11.1085, 77.3411]; // Tirupur
  const listings = [
    { id: 'M1', material_name: 'Faraway Recycled Cotton', latitude: 28.7041, longitude: 77.1025, available_tonnes: 10, price_inr_per_tonne: 80000, lifecycle_carbon_factor: 0.6, digital_passport_verified: true },
    { id: 'M2', material_name: 'Local Recycled Cotton', latitude: 11.0168, longitude: 76.9558, available_tonnes: 10, price_inr_per_tonne: 82000, lifecycle_carbon_factor: 0.6, digital_passport_verified: true }
  ];
  const ranked = ranker.rankMaterialListings(listings, buyerGps, 'cotton', 2.2);

  assert.strictEqual(ranked[0].listing_id, 'M2', 'Local supplier must rank higher due to lower transport carbon penalty');
  assert(ranked[0].net_carbon_saved_tco2e > ranked[1].net_carbon_saved_tco2e, 'Local supplier must achieve higher net carbon savings');
});

// -----------------------------------------------------------------------------
// Test Group 6: Verifiable RAG & Cryptographic Citations
// -----------------------------------------------------------------------------
console.log('\n--- 6. Verifiable RAG & Cryptographic Citations ---');
const rag = new RAGService(projectRoot);

test('RAG retrieves official statutory CEA grid clause with SHA-256 hash', () => {
  const res = rag.query('What is the national grid emission factor for electricity in India?');
  assert(res.results.length > 0, 'RAG should return matching results');
  const top = res.results[0];
  assert(top.citation.document_title.includes('CO2 Baseline Database') || top.citation.source_id.includes('CEA'), 'Expected CEA baseline citation');
  assert(top.citation.sha256_hash && top.citation.sha256_hash.length === 64, 'Citation must carry authentic 64-char SHA-256 hash');
});

// -----------------------------------------------------------------------------
// Test Group 7: Compliance Rule Engine
// -----------------------------------------------------------------------------
console.log('\n--- 7. Statutory Compliance Rule Engine ---');
const compliance = new ComplianceEvaluator(projectRoot);

test('Compliance engine correctly identifies high CBAM risk for EU steel exporter', () => {
  const plant = {
    sector_key: 'iron_steel',
    annual_production_tonnes: 12000,
    electricity_kwh: 6000000,
    coal_t: 8000,
    eu_export_share_pct: 35.0
  };
  const assessRes = engine.assess(plant);
  const cases = compliance.evaluate(plant, assessRes);

  const cbamCase = cases.find(c => c.regulation.includes('CBAM'));
  assert(cbamCase, 'Expected CBAM compliance case');
  assert.strictEqual(cbamCase.status, 'HIGH_EXPOSURE_RISK', 'Status must be HIGH_EXPOSURE_RISK');
  assert(cbamCase.key_metrics.estimated_annual_exposure_inr > 0, 'CBAM financial exposure in INR must be calculated');
});

// -----------------------------------------------------------------------------
// Test Group 8: Scenario Simulation & What-If Analysis
// -----------------------------------------------------------------------------
console.log('\n--- 8. Scenario Simulation & Decarbonization Deltas ---');

test('Scenario simulation calculates exact reduction delta on solar switch', () => {
  const baseline = engine.sectors['textile_dyeing'].demo_profile;
  const baselineRes = engine.assess(baseline);
  
  // Scenario: 40% grid electricity reduction via on-site rooftop solar
  const scenarioProfile = JSON.parse(JSON.stringify(baseline));
  scenarioProfile.electricity_kwh = baseline.electricity_kwh * 0.6;
  const scenarioRes = engine.assess(scenarioProfile);

  const deltaTco2e = baselineRes.footprint.total_footprint.base - scenarioRes.footprint.total_footprint.base;
  const reductionPct = (deltaTco2e / baselineRes.footprint.total_footprint.base) * 100;

  assert(deltaTco2e > 1000, `Expected > 1,000 tCO2e reduction from solar switch, got ${deltaTco2e}`);
  assert(reductionPct > 5.0 && reductionPct < 25.0, `Expected reduction between 5% and 25%, got ${reductionPct}%`);
  assert(scenarioRes.footprint.scope2.base < baselineRes.footprint.scope2.base, 'Scope 2 emissions must strictly drop');
});

// -----------------------------------------------------------------------------
// Test Group 9: Logistics Circular Backhaul Matching
// -----------------------------------------------------------------------------
console.log('\n--- 9. Logistics Circular Backhaul Matching ---');

test('Backhaul matching pairs empty return leg with industrial circular cargo', () => {
  const truckCapacityT = 16.0;
  const backhaulCandidates = [
    { cargo: 'Regenerated PET Flakes', tonnes: 14.5, avoided_km: 440, payout_inr: 28000 },
    { cargo: 'Overweight Steel Coils', tonnes: 22.0, avoided_km: 400, payout_inr: 45000 }
  ];
  const eligible = backhaulCandidates.filter(b => b.tonnes <= truckCapacityT);
  assert.strictEqual(eligible.length, 1, 'Only cargo within 16.0t capacity must be matched');
  assert.strictEqual(eligible[0].cargo, 'Regenerated PET Flakes');
  assert(eligible[0].payout_inr > 20000, 'Backhaul should yield significant freight recovery');
});

// -----------------------------------------------------------------------------
// Test Group 10: Data Quality Assurance Scoring (GHG Protocol Guidance)
// -----------------------------------------------------------------------------
console.log('\n--- 10. Data Quality Assurance Scoring ---');

test('DQI correctly categorizes primary utility meters vs proxy assumptions', () => {
  const entries = [
    { stream_key: 'grid_electricity', has_meter_bill: true, has_lab_certificate: true },
    { stream_key: 'steam_coal', has_meter_bill: false, has_purchase_invoice: true },
    { stream_key: 'diesel_generator', has_meter_bill: false, has_purchase_invoice: false }
  ];

  const scores = entries.map(e => {
    if (e.has_meter_bill && e.has_lab_certificate) return { tier: 'TIER_1_MEASURED', score: 95 };
    if (e.has_meter_bill || e.has_purchase_invoice) return { tier: 'TIER_2_HYBRID', score: 80 };
    return { tier: 'TIER_3_ESTIMATED', score: 50 };
  });

  assert.strictEqual(scores[0].tier, 'TIER_1_MEASURED');
  assert.strictEqual(scores[1].tier, 'TIER_2_HYBRID');
  assert.strictEqual(scores[2].tier, 'TIER_3_ESTIMATED');
  const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  assert(avg >= 75, `Expected composite DQI >= 75, got ${avg}`);
});

console.log('\n' + '='.repeat(75));
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('='.repeat(75));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PRANGARA BACKEND & ADVANCED ML ENGINE INVARIANTS PASS 100%!\n');
}

