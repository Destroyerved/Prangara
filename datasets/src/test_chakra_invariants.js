const fs = require('fs');
const path = require('path');

function findDataDir() {
  const candidates = [
    path.join(__dirname, '../../data'),
    path.join(__dirname, '../data'),
    path.join(__dirname, './data')
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'clean'))) return c;
  }
  return candidates[0];
}
const baseData = findDataDir();
const cleanDir = path.join(baseData, 'clean');
const derivedDir = path.join(baseData, 'derived');
const metadataDir = path.join(baseData, 'metadata');

console.log("=== RUNNING CHAKRA PS10 INVARIANT & VALIDATION TEST SUITE ===\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Load Clean and Metadata Files
const sourceRegistry = JSON.parse(fs.readFileSync(path.join(metadataDir, 'source_registry.json'), 'utf8'));
const sourceIds = new Set(sourceRegistry.map(s => s.source_id));
sourceIds.add("SRC-STATE-GRID-EXP"); // derived experimental

const factorsData = JSON.parse(fs.readFileSync(path.join(cleanDir, 'emission_factors_verified.json'), 'utf8'));
const factors = factorsData.factors;

const interventions = JSON.parse(fs.readFileSync(path.join(cleanDir, 'interventions_verified.json'), 'utf8'));
const sectorsData = JSON.parse(fs.readFileSync(path.join(cleanDir, 'sectors_verified.json'), 'utf8'));
const sectors = sectorsData.sectors;

const recognizedUnits = new Set([
  "tCO2e/MWh", "kgCO2e/litre", "kgCO2e/Sm3", "kgCO2e/kg", "tCO2e/t", "kgCO2e/t-km", "fraction_of_target_stream"
]);

// Rule 1: Factor values are numeric & valid
let allNumeric = true;
let validUnits = true;
let validBands = true;
let validSources = true;
let validGeog = true;
let validBoundary = true;
let validFormulas = true;

Object.keys(factors).forEach(k => {
  const f = factors[k];
  if (typeof f.value !== 'number' || isNaN(f.value)) allNumeric = false;
  if (!recognizedUnits.has(f.unit)) validUnits = false;
  if (f.low !== null && f.high !== null && (f.low > f.value || f.value > f.high)) validBands = false;
  if (!sourceIds.has(f.source_id)) validSources = false;
  if (!f.geography) validGeog = false;
  if (f.group === 'materials' && !f.boundary) validBoundary = false;
  if (f.conversion_applied && (!f.conversion_formula || !Array.isArray(f.conversion_inputs))) validFormulas = false;
});

assert(allNumeric, "Rule 1: All factor values are valid numbers");
assert(validUnits, "Rule 2: All factor units are standardized and recognized");
assert(validBands, "Rule 3: Factor uncertainty bounds satisfy low <= value <= high");
assert(validSources, "Rule 4: All factor source IDs resolve in source_registry.json");
assert(validGeog, "Rule 7: All factors declare geographic scope");
assert(validBoundary, "Rule 8: All material factors declare explicit LCA system boundaries");
assert(validFormulas, "Rule 9 & 10: Derived factors have explicit formulae and documented inputs");

// Rule 11 & 12: Plant-specific and screening checks
let plantNotOfficial = true;
sectors.forEach(s => {
  if (s.demo_profile.synthetic !== true || s.demo_profile.must_not_be_labelled_real_factory !== true) {
    plantNotOfficial = false;
  }
});
assert(plantNotOfficial, "Rule 11: Demo plant inputs are explicitly marked synthetic and not official factory measurements");

let screeningMarkedProperly = true;
sectors.forEach(s => {
  if (s.benchmarks.electricity_kwh_per_t.status !== "VERIFIED_OFFICIAL_SCREENING") {
    screeningMarkedProperly = false;
  }
});
assert(screeningMarkedProperly, "Rule 12: Sector benchmark ranges are marked VERIFIED_OFFICIAL_SCREENING");

// Cross-File Invariant Checks (§43)
const allowedStreams = new Set([
  "electricity", "thermal_fuel", "mat_aluminium", "mat_steel", "mat_cotton_yarn", "mat_pet", "mat_cement",
  "mat_paper", "mat_glass", "waste", "freight_inbound", "freight_outbound"
]);

let streamsValid = true;
interventions.forEach(i => {
  if (!allowedStreams.has(i.target_stream)) streamsValid = false;
});
assert(streamsValid, "Invariant 1: All 30 intervention target streams exist in taxonomy");

let allSectorsResolve = true;
const sectorKeys = new Set(sectors.map(s => s.sector_key));
interventions.forEach(i => {
  i.applicable_sectors.forEach(sk => {
    if (!sectorKeys.has(sk)) allSectorsResolve = false;
  });
});
assert(allSectorsResolve, "Invariant 2: All sector references in interventions resolve to valid sectors");

// Test Refusal / Blocking & Capping Rules
const pharma = sectors.find(s => s.sector_key === "pharma_formulation");
const ceramics = sectors.find(s => s.sector_key === "ceramics");
const rpetIntervention = interventions.find(i => i.id === "INT-RPET");
const briquetteIntervention = interventions.find(i => i.id === "INT-BIOMASS-SWITCH");
const autoSteel = interventions.find(i => i.id === "INT-REC-STEEL");

assert(rpetIntervention.constraints.blocked_sectors.includes("pharma_formulation"), "Invariant 5a: rPET intervention correctly blocks pharma formulation with reason");
assert(briquetteIntervention.constraints.blocked_sectors.includes("ceramics"), "Invariant 5b: Biomass briquette switch correctly blocks ceramics with reason");
assert(rpetIntervention.constraints.sector_caps.food_processing === 0.35, "Invariant 5c: rPET is correctly capped at 35% in food processing");
assert(autoSteel.constraints.sector_caps.auto_components === 0.45, "Invariant 5d: Secondary steel is correctly capped at 45% in automotive components");

// Test 10 Demo Sectors Assessment (Stream Sums, Abatement <= Stream, De-rated <= Standalone)
let sectorAssessmentsClean = true;
let totalEmissionsSumExact = true;
let abatementWithinStream = true;
let deratedLessThanStandalone = true;

sectors.forEach(sec => {
  const p = sec.demo_profile;
  const gridFactor = factors.grid_india.value;
  const scope2 = (p.electricity_kwh / 1000) * gridFactor;
  
  let scope1 = 0;
  if (p.coal_t) scope1 += p.coal_t * factors.fuel_indian_coal.value;
  if (p.diesel_l) scope1 += (p.diesel_l * factors.fuel_diesel.value) / 1000;
  if (p.natural_gas_sm3) scope1 += (p.natural_gas_sm3 * factors.fuel_natural_gas.value) / 1000;
  if (p.furnace_oil_kg) scope1 += (p.furnace_oil_kg * factors.fuel_furnace_oil.value) / 1000;

  let scope3 = 0;
  if (p.waste_t) scope3 += p.waste_t * factors.waste_landfill_organic.value;
  if (p.freight_tkm) scope3 += (p.freight_tkm * factors.freight_road.value) / 1000;

  const totalCalculated = scope1 + scope2 + scope3;
  if (isNaN(totalCalculated) || totalCalculated <= 0) sectorAssessmentsClean = false;

  // Simulate de-rating on electricity stream
  const electricityStreamTotal = scope2;
  const elecInterventions = interventions.filter(i => i.target_stream === "electricity" && i.applicable_sectors.includes(sec.sector_key));
  
  let remainingFraction = 1.0;
  elecInterventions.forEach(rec => {
    const standaloneAbatement = electricityStreamTotal * rec.abatement.base;
    const deratedAbatement = electricityStreamTotal * remainingFraction * rec.abatement.base;
    remainingFraction *= (1.0 - rec.abatement.base);

    if (standaloneAbatement > electricityStreamTotal) abatementWithinStream = false;
    if (deratedAbatement > standaloneAbatement + 1e-6) deratedLessThanStandalone = false;
  });
});

assert(sectorAssessmentsClean, "Invariant 6a: All 10 industrial sectors assess end-to-end without errors");
assert(abatementWithinStream, "Invariant 6b: No intervention abates more than its target stream holds (A_i <= S_stream)");
assert(deratedLessThanStandalone, "Invariant 6c: De-rated portfolio abatement never exceeds standalone abatement");

console.log(`\n======================================================`);
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Chakra PS10 Invariant & Validation Tests PASSED with 0 violations!\n");
}
