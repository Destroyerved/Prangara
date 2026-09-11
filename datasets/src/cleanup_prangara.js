const fs = require('fs');
const path = require('path');

const prangaraDir = 'c:/Users/vedan/OneDrive/Desktop/prangara';

function removeRecursive(dir, pattern) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeRecursive(full, pattern);
      // If directory is empty, remove it
      if (fs.readdirSync(full).length === 0 && (entry.name === 'reports' || entry.name === 'metadata')) {
        fs.rmdirSync(full);
        console.log(`Removed empty folder: ${full}`);
      }
    } else {
      if (pattern.test(entry.name)) {
        fs.unlinkSync(full);
        console.log(`Deleted from prangara: ${full}`);
      }
    }
  }
}

// Remove all Chakra files from prangara
removeRecursive(prangaraDir, /chakra/i);

// Reset prangara/type_dictionary.json to strictly PS11 datasets
const dictPath = path.join(prangaraDir, 'type_dictionary.json');
const ps11TypeDictionary = {
  "version": "1.0.0",
  "pipeline": "PS11 Data Refining & Type Conversion",
  "standard_units": {
    "mass": "tonnes",
    "daily_capacity": "tonnes_per_day",
    "annual_capacity": "tonnes_per_year",
    "distance": "km",
    "area": "hectares",
    "carbon": "kgCO2e",
    "carbon_reporting": "tCO2e",
    "currency": "INR",
    "percentage": "0_to_100_decimal"
  },
  "geospatial": {
    "crs": "EPSG:4326 (WGS84)",
    "geojson_coordinate_order": "[longitude, latitude]",
    "postgis_type": "geometry(Point, 4326)",
    "precision_tiers": [
      "EXACT_GPS",
      "VERIFIED_ADDRESS",
      "CITY_LEVEL",
      "DISTRICT_LEVEL",
      "UNKNOWN"
    ]
  },
  "authenticity_classes": [
    {
      "code": "OFFICIAL_REPORTED",
      "badge": "🟢 OFFICIAL",
      "description": "Statutory data published by government ministries, census, or scientific bodies."
    },
    {
      "code": "OPERATOR_REPORTED",
      "badge": "🔵 OPERATOR",
      "description": "Operational inventory directly entered by generator or facility operator."
    },
    {
      "code": "CALCULATED_DERIVED",
      "badge": "🟡 CALCULATED",
      "description": "Values computed by platform algorithms using documented formulas."
    }
  ],
  "null_handling_rules": {
    "raw_tokens_to_null": ["NA", "N/A", "-", "--", "Unknown", "Not Available", "null", ""],
    "zero_policy": "Never convert unknown or null to 0. Zero is reserved exclusively for measured zero quantities."
  },
  "datasets": {
    "facilities": {
      "facility_id": { "type": "VARCHAR(64)", "format": "FAC-MNRE-XXX", "nullable": false },
      "official_application_id": { "type": "VARCHAR(64)", "format": "MNRE-GJ-YYYY-XXX", "nullable": false },
      "project_name": { "type": "VARCHAR(255)", "nullable": false },
      "project_developer": { "type": "VARCHAR(255)", "nullable": false },
      "district_id": { "type": "VARCHAR(16)", "format": "GJ_XXX", "nullable": false },
      "installed_capacity_tpd": { "type": "NUMERIC(10,2)", "unit": "tonnes_per_day", "min": 0.1, "nullable": false },
      "primary_technology": { "type": "ENUM(BIOCNG, BIOGAS, BIOCHAR, WASTE_TO_ENERGY)", "nullable": false },
      "commissioning_status": { "type": "ENUM(PROPOSED, SANCTIONED, COMMISSIONED, OPERATIONAL)", "nullable": false },
      "latitude": { "type": "NUMERIC(9,6)", "min": 20.0, "max": 24.8, "nullable": false },
      "longitude": { "type": "NUMERIC(9,6)", "min": 68.0, "max": 74.8, "nullable": false },
      "location_precision": { "type": "VARCHAR(32)", "default": "EXACT_GPS", "nullable": false }
    },
    "municipal_waste": {
      "ulb_code": { "type": "VARCHAR(16)", "nullable": false },
      "ulb_name": { "type": "VARCHAR(255)", "nullable": false },
      "district_id": { "type": "VARCHAR(16)", "nullable": false },
      "population": { "type": "BIGINT", "min": 0, "nullable": false },
      "waste_generated_tpd": { "type": "NUMERIC(10,2)", "unit": "tonnes_per_day", "nullable": false },
      "waste_processed_tpd": { "type": "NUMERIC(10,2)", "unit": "tonnes_per_day", "nullable": false },
      "processing_percent": { "type": "NUMERIC(5,2)", "unit": "percentage", "min": 0, "max": 100, "nullable": false }
    },
    "crop_production": {
      "district_id": { "type": "VARCHAR(16)", "nullable": false },
      "crop_name": { "type": "VARCHAR(64)", "nullable": false },
      "season": { "type": "ENUM(Kharif, Rabi, Summer)", "nullable": false },
      "area_hectares": { "type": "NUMERIC(12,2)", "unit": "hectares", "nullable": false },
      "production_tonnes": { "type": "NUMERIC(12,2)", "unit": "tonnes", "nullable": false },
      "yield_kg_per_hectare": { "type": "NUMERIC(10,2)", "unit": "kg/ha", "nullable": false }
    },
    "livestock_census": {
      "district_id": { "type": "VARCHAR(16)", "nullable": false },
      "species": { "type": "VARCHAR(64)", "nullable": false },
      "population_head": { "type": "INTEGER", "min": 0, "nullable": false },
      "rural_head": { "type": "INTEGER", "min": 0, "nullable": false },
      "urban_head": { "type": "INTEGER", "min": 0, "nullable": false }
    },
    "mrf_streams": {
      "mrf_id": { "type": "VARCHAR(32)", "nullable": false },
      "facility_name": { "type": "VARCHAR(255)", "nullable": false },
      "district_id": { "type": "VARCHAR(16)", "nullable": false },
      "material_category": { "type": "VARCHAR(64)", "nullable": false },
      "incoming_tpd": { "type": "NUMERIC(10,2)", "unit": "tonnes_per_day", "nullable": false },
      "recovered_tpd": { "type": "NUMERIC(10,2)", "unit": "tonnes_per_day", "nullable": false },
      "recovery_rate_percent": { "type": "NUMERIC(5,2)", "unit": "percentage", "nullable": false }
    },
    "waste_listings": {
      "listing_id": { "type": "VARCHAR(32)", "primary_key": true, "nullable": false },
      "generator_name": { "type": "VARCHAR(255)", "nullable": false },
      "waste_type": { "type": "VARCHAR(64)", "nullable": false },
      "feedstock_category": { "type": "VARCHAR(32)", "nullable": false },
      "quantity_tonnes": { "type": "NUMERIC(10,2)", "unit": "tonnes", "nullable": false },
      "moisture_percent": { "type": "NUMERIC(5,2)", "unit": "percentage", "nullable": false },
      "latitude": { "type": "NUMERIC(9,6)", "nullable": false },
      "longitude": { "type": "NUMERIC(9,6)", "nullable": false },
      "digital_passport_hash": { "type": "CHAR(64)", "format": "SHA256_HEX", "nullable": false }
    }
  }
};

fs.writeFileSync(dictPath, JSON.stringify(ps11TypeDictionary, null, 2));
console.log("✓ Reset prangara/type_dictionary.json to strictly PS11 schema.");
console.log("Cleanup complete!");
