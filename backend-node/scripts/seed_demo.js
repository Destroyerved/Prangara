/**
 * PRANGARA — Master Demo Database & Fixture Seeder
 * Populates complete coherent demo data for live presentation:
 * - 1 Admin, 1 Compliance Officer, 1 Manufacturer User
 * - 3 Full Factory Profiles (Tirupur Knitwear, Coimbatore Foundry, Morbi Tile)
 * - 3 Pre-configured Statutory Compliance Cases (EU CBAM, India CCTS, SEBI BRSR Core)
 * - 5 Verified Provider & Material Listings
 * - 2 Correlated Shipments & 1 Multi-Tenant Truck Pooling Opportunity
 */

const fs = require('fs');
const path = require('path');

const demoFixture = {
  version: '2.0.0',
  generated_at: new Date().toISOString(),
  users: [
    { user_id: 'USR-01', role: 'ADMIN', name: 'Rudra Admin', email: 'admin@prangara.org' },
    { user_id: 'USR-02', role: 'MANUFACTURER', name: 'Senthil Kumar (MD)', company: 'Tirupur Processors Pvt Ltd', email: 'senthil@tirupurprocessors.com' },
    { user_id: 'USR-03', role: 'COMPLIANCE_OFFICER', name: 'Dr. Ananya Sharma', agency: 'BEE Empanelled Energy Auditor', email: 'ananya.audits@bee.gov.in' }
  ],
  factories: [
    {
      factory_id: 'FAC-HERO-01',
      company_name: 'Tirupur Processors Pvt Ltd',
      sector_key: 'textile_dyeing',
      cluster: 'Tirupur, Tamil Nadu',
      state_code: 'TN',
      annual_output_t: 3600,
      revenue_cr: 42.0,
      activity: {
        electricity_kwh: 4800000,
        coal_t: 5200,
        diesel_l: 45000,
        cotton_yarn_t: 3900,
        waste_t: 720,
        freight_tkm: 1800000,
        eu_export_share_pct: 45.0
      },
      hero_status: 'HERO_DEMO_FACILITY'
    },
    {
      factory_id: 'FAC-02',
      company_name: 'Kovai Ferrous Jobbing Foundry',
      sector_key: 'foundry_casting',
      cluster: 'Coimbatore, Tamil Nadu',
      state_code: 'TN',
      annual_output_t: 5000,
      revenue_cr: 38.0,
      activity: {
        electricity_kwh: 3500000,
        coke_tonnes: 1200,
        steel_purchased_tonnes: 4800,
        eu_export_share_pct: 25.0
      }
    },
    {
      factory_id: 'FAC-03',
      company_name: 'Morbi Vitrified Ceramics Ltd',
      sector_key: 'ceramics',
      cluster: 'Morbi, Gujarat',
      state_code: 'GJ',
      annual_output_t: 12000,
      revenue_cr: 65.0,
      activity: {
        electricity_kwh: 2400000,
        natural_gas_sm3: 1800000,
        eu_export_share_pct: 15.0
      }
    }
  ],
  compliance_cases: [
    {
      case_id: 'CASE-CBAM-01',
      factory_id: 'FAC-02',
      regulation: 'EU CBAM (Definitive Phase)',
      status: 'ACTION_REQUIRED',
      exposure_inr_annual: 4650000,
      deadline: '2026-10-31',
      summary: 'Kovai Foundry exports cast iron components to Germany; requires certified embedded emission declaration.'
    },
    {
      case_id: 'CASE-CCTS-01',
      factory_id: 'FAC-HERO-01',
      regulation: 'India CCTS Voluntary Crediting',
      status: 'ELIGIBLE_FOR_OFFSET_GENERATION',
      annual_credit_potential_ccc: 4200,
      summary: 'Tirupur plant WHR and biomass boiler project qualifies for tradable domestic Carbon Credit Certificates.'
    },
    {
      case_id: 'CASE-BRSR-01',
      factory_id: 'FAC-HERO-01',
      regulation: 'SEBI BRSR Core Value Chain',
      status: 'VERIFIED_TRANSPARENCY',
      summary: 'Scope 1, 2, and 3 footprint validated with cryptographic SHA-256 baseline citations.'
    }
  ],
  marketplace_listings: [
    {
      listing_id: 'LIST-01',
      supplier_name: 'Coimbatore Circular Fibres',
      material_name: 'Mechanical Post-Industrial Recycled Cotton Yarn (20s Count)',
      category: 'material',
      latitude: 11.0168,
      longitude: 76.9558,
      available_tonnes: 45.0,
      price_inr_per_tonne: 85000,
      carbon_intensity_kgco2e_per_kg: 0.65,
      digital_passport_verified: true
    },
    {
      listing_id: 'LIST-02',
      supplier_name: 'Erode Agro-Biofuels Pvt Ltd',
      material_name: 'High-Density Groundnut Shell & Sawdust Biomass Briquettes',
      category: 'thermal_fuel',
      latitude: 11.3410,
      longitude: 77.7172,
      available_tonnes: 250.0,
      price_inr_per_tonne: 5400,
      net_calorific_value_kcal_per_kg: 4100,
      digital_passport_verified: true
    },
    {
      listing_id: 'LIST-03',
      supplier_name: 'Tamil Nadu Waste Heat Solutions (Grade-1 ESCO)',
      service_name: 'Flue-Gas Heat Exchanger & Stenter Heat Recovery System',
      category: 'esco_service',
      latitude: 11.1085,
      longitude: 77.3411,
      typical_payback_months: 14.5,
      bee_grade: 'Grade-1 ESCO'
    }
  ],
  logistics_pooling: {
    corridor: 'Tamil Nadu Industrial Belt to Chennai Port Container Terminal',
    origin_cluster: 'Tirupur & Coimbatore',
    destination: 'Chennai Port',
    merged_shipments: [
      { id: 'SHIP-TN-01', shipper: 'Tirupur Processors Pvt Ltd', cargo: 'Finished Knitwear Cartons', weight_tonnes: 8.5 },
      { id: 'SHIP-TN-02', shipper: 'Kovai Ferrous Jobbing Foundry', cargo: 'Machined Pump Castings', weight_tonnes: 9.2 }
    ],
    vehicle_type: '28-Tonne Articulated Multi-Axle Euro-VI Truck',
    total_payload_tonnes: 17.7,
    capacity_utilization_pct: 88.5,
    empty_running_eliminated_km: 440,
    carbon_saved_kgco2e: 485,
    cost_saved_inr: 16800
  }
};

const outDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const targetPath = path.join(outDir, 'seed_demo_payload.json');

fs.writeFileSync(targetPath, JSON.stringify(demoFixture, null, 2));

console.log('='.repeat(75));
console.log('PRANGARA MASTER DEMO SEED DATA GENERATED');
console.log('='.repeat(75));
console.log(`Saved demo payload to: ${targetPath}`);
console.log(`Hero Factory      : ${demoFixture.factories[0].company_name} (${demoFixture.factories[0].cluster})`);
console.log(`Compliance Cases  : ${demoFixture.compliance_cases.length} pre-configured cases`);
console.log(`Marketplace Items : ${demoFixture.marketplace_listings.length} verified listings`);
console.log(`Truck Pooling Run : ${demoFixture.logistics_pooling.corridor} (${demoFixture.logistics_pooling.capacity_utilization_pct}% utilization)`);
console.log('='.repeat(75));
