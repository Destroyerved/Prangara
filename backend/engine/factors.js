/**
 * PRANGARA Carbon Engine — Factors & Uncertainty Propagation (Node.js/ESM)
 * Loads statutory emission factors, propagates uncertainty bands [low, base, high],
 * and resolves state grid variations for Indian industrial MSMEs.
 */

const fs = require('fs');
const path = require('path');

class Band {
  constructor(base, low, high) {
    this.base = Number(base);
    this.low = Number(low !== undefined ? low : base);
    this.high = Number(high !== undefined ? high : base);

    if (this.low > this.base + 1e-6 || this.base > this.high + 1e-6) {
      throw new Error(`Band invariant violation: low (${this.low}) <= base (${this.base}) <= high (${this.high}) must hold`);
    }
  }

  add(other) {
    if (other instanceof Band) {
      return new Band(this.base + other.base, this.low + other.low, this.high + other.high);
    }
    const val = Number(other);
    return new Band(this.base + val, this.low + val, this.high + val);
  }

  sub(other) {
    if (other instanceof Band) {
      return new Band(this.base - other.base, this.low - other.high, this.high - other.low);
    }
    const val = Number(other);
    return new Band(this.base - val, this.low - val, this.high - val);
  }

  mul(scalar) {
    const k = Number(scalar);
    if (k >= 0) {
      return new Band(this.base * k, this.low * k, this.high * k);
    } else {
      return new Band(this.base * k, this.high * k, this.low * k);
    }
  }

  div(scalar) {
    const k = Number(scalar);
    if (k === 0) throw new Error('Cannot divide Band by zero scalar');
    return this.mul(1.0 / k);
  }

  get uncertaintyPct() {
    if (this.base === 0) return 0.0;
    const delta = Math.max(Math.abs(this.high - this.base), Math.abs(this.base - this.low));
    return Number(((delta / this.base) * 100.0).toFixed(1));
  }

  toJSON() {
    return {
      base: Number(this.base.toFixed(4)),
      low: Number(this.low.toFixed(4)),
      high: Number(this.high.toFixed(4)),
      uncertainty_pct: this.uncertaintyPct
    };
  }
}

class FactorDB {
  constructor(datasetRoot) {
    this.factors = {};
    this.stateGrids = {};
    this.root = datasetRoot || path.resolve(__dirname, '..', '..');
    this.loadData();
  }

  loadData() {
    const factorsPath = path.join(this.root, 'datasets', '01_statutory_emission_baselines', 'chakra_emission_factors.json');
    if (fs.existsSync(factorsPath)) {
      const data = JSON.parse(fs.readFileSync(factorsPath, 'utf8'));
      this.factors = data.factors || {};
      this.stateGrids = data.state_grid_variants || {};
    } else {
      this.initDefaults();
    }
  }

  initDefaults() {
    this.factors = {
      grid_electricity_in: { key: 'grid_electricity_in', value: 0.716, low: 0.680, high: 0.752, unit: 'tCO2e/MWh', scope: 2, source_id: 'SRC-CEA-V22' },
      diesel_combustion: { key: 'diesel_combustion', value: 2.684, low: 2.610, high: 2.760, unit: 'kgCO2e/litre', scope: 1, source_id: 'SRC-DESNZ-2026' },
      natural_gas_combustion: { key: 'natural_gas_combustion', value: 2.023, low: 1.960, high: 2.080, unit: 'kgCO2e/Sm3', scope: 1, source_id: 'SRC-DESNZ-2026' },
      coal_indian_msme: { key: 'coal_indian_msme', value: 1.395, low: 1.250, high: 1.540, unit: 'tCO2/t', scope: 1, source_id: 'SRC-IPCC-2019' },
      furnace_oil_combustion: { key: 'furnace_oil_combustion', value: 3.176, low: 3.080, high: 3.270, unit: 'kgCO2e/litre', scope: 1, source_id: 'SRC-DESNZ-2026' },
      lpg_combustion: { key: 'lpg_combustion', value: 2.939, low: 2.850, high: 3.030, unit: 'kgCO2e/kg', scope: 1, source_id: 'SRC-DESNZ-2026' },
      cotton_raw_gin: { key: 'cotton_raw_gin', value: 2.200, low: 1.800, high: 2.650, unit: 'kgCO2e/kg', scope: 3, source_id: 'SRC-TEXTILE-EXCHANGE-2026' },
      steel_bf_bof_virgin: { key: 'steel_bf_bof_virgin', value: 2.320, low: 2.100, high: 2.550, unit: 'kgCO2e/kg', scope: 3, source_id: 'SRC-WORLDSTEEL-2025' },
      pet_virgin_granules: { key: 'pet_virgin_granules', value: 2.150, low: 1.950, high: 2.350, unit: 'kgCO2e/kg', scope: 3, source_id: 'SRC-PLASTICSEUROPE-2024' },
      aluminium_ingot_primary: { key: 'aluminium_ingot_primary', value: 8.900, low: 8.200, high: 9.600, unit: 'kgCO2e/kg', scope: 3, source_id: 'SRC-IAI-2025' },
      freight_road_heavy_rigid: { key: 'freight_road_heavy_rigid', value: 0.089, low: 0.075, high: 0.105, unit: 'kgCO2e/t-km', scope: 3, source_id: 'SRC-SFC-INDIA-2024' },
      waste_mixed_industrial_landfill: { key: 'waste_mixed_industrial_landfill', value: 0.450, low: 0.320, high: 0.610, unit: 'tCO2e/t', scope: 3, source_id: 'SRC-CPCB-2016' }
    };
    this.stateGrids = {
      TN: { name: 'Tamil Nadu', derived_value: 0.625 },
      GJ: { name: 'Gujarat', derived_value: 0.742 },
      MH: { name: 'Maharashtra', derived_value: 0.785 },
      KA: { name: 'Karnataka', derived_value: 0.580 },
      OR: { name: 'Odisha', derived_value: 0.940 },
      WB: { name: 'West Bengal', derived_value: 0.915 },
      PB: { name: 'Punjab', derived_value: 0.710 }
    };
  }

  getFactor(key) {
    if (!this.factors[key]) {
      throw new Error(`Emission factor '${key}' is not recognized in statutory registry.`);
    }
    return this.factors[key];
  }

  getBand(key) {
    const f = this.getFactor(key);
    return new Band(f.value, f.low !== undefined ? f.low : f.value, f.high !== undefined ? f.high : f.value);
  }

  resolveGridFactor(stateCode) {
    const nat = this.getBand('grid_electricity_in');
    if (!stateCode) return nat;
    const st = stateCode.toUpperCase().trim();
    if (this.stateGrids[st]) {
      const stateVal = this.stateGrids[st].derived_value;
      const ratio = stateVal / nat.base;
      return new Band(stateVal, nat.low * ratio, nat.high * ratio);
    }
    return nat;
  }

  convertToTCO2e(factorKey, quantity, stateCode) {
    if (factorKey === 'grid_electricity_in') {
      const band = this.resolveGridFactor(stateCode);
      return band.mul(quantity);
    }
    const f = this.getFactor(factorKey);
    const unit = f.unit || '';
    const band = this.getBand(factorKey);

    if (unit.startsWith('kgCO2') || unit.startsWith('kgCO2e')) {
      return band.mul(quantity).div(1000.0);
    } else if (unit.startsWith('tCO2') || unit.startsWith('tCO2e')) {
      return band.mul(quantity);
    } else {
      throw new Error(`Unrecognized canonical unit: '${unit}' for factor '${factorKey}'`);
    }
  }
}

module.exports = { Band, FactorDB };
