/**
 * PRANGARA Carbon Engine — Footprint & Stream Inventory
 * Calculates Scope 1, Scope 2, and Scope 3 emissions by physical stream.
 * Distinguishes gate-to-gate (Scope 1 + 2) for benchmark comparison from cradle-to-gate total.
 */

const { Band, FactorDB } = require('./factors');

class Stream {
  constructor(name, scope, category, physicalQty, unit, tco2eBand, factorKey, isBiogenic = false) {
    this.name = name;
    this.scope = scope; // 1, 2, or 3
    this.category = category; // 'electricity', 'thermal_fuel', 'mobile_fuel', 'material', 'logistics', 'waste'
    this.physicalQty = Number(physicalQty);
    this.unit = unit;
    this.tco2eBand = tco2eBand;
    this.factorKey = factorKey;
    this.isBiogenic = isBiogenic;
  }

  toJSON() {
    return {
      name: this.name,
      scope: this.scope,
      category: this.category,
      physical_qty: this.physicalQty,
      unit: this.unit,
      tco2e: this.tco2eBand.toJSON(),
      factor_key: this.factorKey,
      is_biogenic: this.isBiogenic
    };
  }
}

class FootprintCalculator {
  constructor(factorDb) {
    this.db = factorDb || new FactorDB();
  }

  calculate(profile) {
    const streams = [];
    const state = profile.state_code || profile.state || null;
    const annualProduction = Math.max(0.001, Number(profile.annual_production_tonnes || profile.annual_output_tonnes || profile.annual_output_t || 1.0));

    // 1. Scope 2 — Grid Electricity
    const elecKwh = Number(profile.electricity_kwh || (profile.electricity_mwh ? profile.electricity_mwh * 1000 : 0));
    if (elecKwh > 0) {
      const mwh = elecKwh / 1000.0;
      const band = this.db.convertToTCO2e('grid_electricity_in', mwh, state);
      streams.push(new Stream('grid_electricity', 2, 'electricity', mwh, 'MWh', band, 'grid_electricity_in'));
    }

    // 2. Scope 1 — Fuels
    // Diesel (Genset electricity / internal mobile)
    const dieselLitres = Number(profile.diesel_litres || profile.diesel_l || 0);
    if (dieselLitres > 0) {
      const band = this.db.convertToTCO2e('diesel_combustion', dieselLitres);
      streams.push(new Stream('diesel_fuel', 1, 'mobile_fuel', dieselLitres, 'litres', band, 'diesel_combustion'));
    }
    // Natural Gas (Process Heat)
    const naturalGasSm3 = Number(profile.natural_gas_sm3 || profile.natural_gas_m3 || 0);
    if (naturalGasSm3 > 0) {
      const band = this.db.convertToTCO2e('natural_gas_combustion', naturalGasSm3);
      streams.push(new Stream('natural_gas', 1, 'thermal_fuel', naturalGasSm3, 'Sm3', band, 'natural_gas_combustion'));
    }
    // Coal (Process Heat / Boiler)
    const coalTonnes = Number(profile.coal_tonnes || profile.coal_t || 0);
    if (coalTonnes > 0) {
      const factorKey = profile.coal_grade ? `coal_${profile.coal_grade.toLowerCase()}` : 'coal_indian_msme';
      const key = this.db.factors[factorKey] ? factorKey : 'coal_indian_msme';
      const band = this.db.convertToTCO2e(key, coalTonnes);
      streams.push(new Stream('coal_combustion', 1, 'thermal_fuel', coalTonnes, 'tonnes', band, key));
    }
    // Furnace Oil
    const furnaceOilLitres = Number(profile.furnace_oil_litres || profile.furnace_oil_l || 0);
    if (furnaceOilLitres > 0) {
      const band = this.db.convertToTCO2e('furnace_oil_combustion', furnaceOilLitres);
      streams.push(new Stream('furnace_oil', 1, 'thermal_fuel', furnaceOilLitres, 'litres', band, 'furnace_oil_combustion'));
    }
    // LPG
    const lpgKg = Number(profile.lpg_kg || 0);
    if (lpgKg > 0) {
      const band = this.db.convertToTCO2e('lpg_combustion', lpgKg);
      streams.push(new Stream('lpg', 1, 'thermal_fuel', lpgKg, 'kg', band, 'lpg_combustion'));
    }

    // 3. Scope 3 — Upstream Materials
    if (profile.materials && Array.isArray(profile.materials)) {
      for (const mat of profile.materials) {
        const qty = Number(mat.quantity_kg || (mat.quantity_tonnes ? mat.quantity_tonnes * 1000 : 0));
        if (qty > 0 && mat.factor_key && this.db.factors[mat.factor_key]) {
          const band = this.db.convertToTCO2e(mat.factor_key, qty);
          streams.push(new Stream(mat.name || mat.factor_key, 3, 'material', qty, 'kg', band, mat.factor_key));
        }
      }
    }

    // Cotton Yarn (Textile hero)
    const cottonTonnes = Number(profile.cotton_yarn_tonnes || profile.cotton_yarn_t || 0);
    if (cottonTonnes > 0) {
      const kg = cottonTonnes * 1000.0;
      const band = this.db.convertToTCO2e('cotton_raw_gin', kg);
      streams.push(new Stream('purchased_cotton_yarn', 3, 'material', kg, 'kg', band, 'cotton_raw_gin'));
    }
    // Raw Steel (Foundry/Engineering hero)
    const steelTonnes = Number(profile.steel_purchased_tonnes || profile.steel_t || 0);
    if (steelTonnes > 0) {
      const kg = steelTonnes * 1000.0;
      const band = this.db.convertToTCO2e('steel_bf_bof_virgin', kg);
      streams.push(new Stream('purchased_virgin_steel', 3, 'material', kg, 'kg', band, 'steel_bf_bof_virgin'));
    }
    // Virgin PET Granules (Plastic hero)
    const petTonnes = Number(profile.pet_granules_tonnes || profile.pet_t || 0);
    if (petTonnes > 0) {
      const kg = petTonnes * 1000.0;
      const band = this.db.convertToTCO2e('pet_virgin_granules', kg);
      streams.push(new Stream('virgin_pet_granules', 3, 'material', kg, 'kg', band, 'pet_virgin_granules'));
    }

    // 4. Scope 3 — Freight
    const freightTkm = Number(profile.freight_t_km || profile.freight_tkm || 0);
    if (freightTkm > 0) {
      const band = this.db.convertToTCO2e('freight_road_heavy_rigid', freightTkm);
      streams.push(new Stream('road_freight', 3, 'logistics', freightTkm, 't-km', band, 'freight_road_heavy_rigid'));
    }

    // 5. Scope 3 — Waste to Landfill
    const wasteTonnes = Number(profile.waste_landfill_tonnes || profile.waste_t || 0);
    if (wasteTonnes > 0) {
      const band = this.db.convertToTCO2e('waste_mixed_industrial_landfill', wasteTonnes);
      streams.push(new Stream('landfill_waste', 3, 'waste', wasteTonnes, 'tonnes', band, 'waste_mixed_industrial_landfill'));
    }

    // Summation with Band propagation
    let s1 = new Band(0, 0, 0);
    let s2 = new Band(0, 0, 0);
    let s3 = new Band(0, 0, 0);

    for (const st of streams) {
      if (st.isBiogenic) continue; // Biogenic CO2 memo line per GHG Protocol
      if (st.scope === 1) s1 = s1.add(st.tco2eBand);
      else if (st.scope === 2) s2 = s2.add(st.tco2eBand);
      else if (st.scope === 3) s3 = s3.add(st.tco2eBand);
    }

    const total = s1.add(s2).add(s3);
    const gateToGateTotal = s1.add(s2);

    return {
      scope1: s1.toJSON(),
      scope2: s2.toJSON(),
      scope3: s3.toJSON(),
      total_footprint: total.toJSON(),
      gate_to_gate_footprint: gateToGateTotal.toJSON(),
      gate_to_gate_intensity: (gateToGateTotal.div(annualProduction)).toJSON(),
      cradle_to_gate_intensity: (total.div(annualProduction)).toJSON(),
      streams: streams.map(s => s.toJSON()),
      stream_objects: streams
    };
  }
}

module.exports = { Stream, FootprintCalculator };
