/**
 * PRANGARA Carbon Engine — Assessment Orchestrator
 * Assembles Footprint -> Leaks -> MACC Portfolio -> Sankey Graph -> Compliance Exposure.
 */

const fs = require('fs');
const path = require('path');
const { FactorDB } = require('./factors');
const { FootprintCalculator } = require('./footprint');
const { LeakDetector } = require('./leaks');
const { MACCRecommender } = require('./macc');

class CarbonEngine {
  constructor(datasetRoot) {
    this.root = datasetRoot || path.resolve(__dirname, '..', '..');
    this.factorDb = new FactorDB(this.root);
    this.footprintCalc = new FootprintCalculator(this.factorDb);
    this.sectors = this.loadSectors();
    this.leakDetector = new LeakDetector(this.sectors);
    this.maccRecommender = new MACCRecommender(this.root);
  }

  loadSectors() {
    const candidates = [
      path.join(this.root, 'datasets', 'data', 'clean', 'sectors_verified.json'),
      path.join(this.root, 'datasets', '03_industrial_sector_benchmarks', 'chakra_sectors.json'),
      path.join(this.root, 'datasets', 'data', 'legacy', 'sectors.json')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(raw.sectors)) {
          const dict = {};
          for (const s of raw.sectors) {
            dict[s.sector_key] = s;
          }
          return dict;
        } else if (raw.sectors && typeof raw.sectors === 'object') {
          return raw.sectors;
        } else if (typeof raw === 'object') {
          return raw;
        }
      }
    }
    return {};
  }

  assess(profile) {
    const sectorKey = profile.sector_key || profile.sector || 'textile_dyeing';
    const annualProd = Math.max(0.001, Number(profile.annual_production_tonnes || profile.annual_output_tonnes || 1000.0));

    // 1. Calculate Footprint
    const footprint = this.footprintCalc.calculate(profile);

    // 2. Detect Leaks
    const leaks = this.leakDetector.detect(footprint, sectorKey, annualProd);

    // 3. Generate MACC Recommendations
    const macc = this.maccRecommender.recommend(footprint, profile);

    // 4. Construct Sankey Flow Diagram Data
    const sankey = this.buildSankey(footprint);

    // 5. Compliance Exposure
    const compliance = this.calculateComplianceExposure(footprint, profile);

    // 6. Generate Executive Headline
    const headline = this.generateHeadline(footprint, leaks, macc, profile);

    return {
      assessment_id: `ASSESS-${Date.now()}`,
      timestamp: new Date().toISOString(),
      plant_name: profile.company_name || profile.plant_name || 'Industrial MSME Facility',
      sector: sectorKey,
      state: profile.state_code || profile.state || 'All-India National Grid',
      footprint,
      leaks,
      macc,
      sankey,
      compliance,
      headline
    };
  }

  buildSankey(footprint) {
    const nodes = [
      { id: 'total', name: 'Total Plant Footprint' },
      { id: 'scope1', name: 'Scope 1 Direct' },
      { id: 'scope2', name: 'Scope 2 Electricity' },
      { id: 'scope3', name: 'Scope 3 Value Chain' }
    ];
    const links = [];

    // Scope to Total
    if (footprint.scope1.base > 0) links.push({ source: 'scope1', target: 'total', value: footprint.scope1.base });
    if (footprint.scope2.base > 0) links.push({ source: 'scope2', target: 'total', value: footprint.scope2.base });
    if (footprint.scope3.base > 0) links.push({ source: 'scope3', target: 'total', value: footprint.scope3.base });

    // Stream to Scope
    for (const st of (footprint.streams || [])) {
      const streamNodeId = `stream_${st.name}`;
      nodes.push({ id: streamNodeId, name: st.name.replace(/_/g, ' ') });
      const targetScope = `scope${st.scope}`;
      links.push({ source: streamNodeId, target: targetScope, value: st.tco2e.base });
    }

    return { nodes, links };
  }

  calculateComplianceExposure(footprint, profile) {
    const exportShare = Number(profile.eu_export_share_pct || profile.export_eu_pct || 0.0) / 100.0;
    const directEmissions = footprint.scope1.base + footprint.scope2.base;
    const cbamBenchmarkPriceInr = 7650.0; // €85/tCO2e @ ₹90/€
    const exposedTonnes = directEmissions * exportShare;
    const cbamFinancialExposureInr = exposedTonnes * cbamBenchmarkPriceInr;

    return {
      cbam: {
        is_exposed: exportShare > 0,
        eu_export_share_pct: exportShare * 100,
        exposed_direct_tco2e: Number(exposedTonnes.toFixed(1)),
        reference_price_inr_per_tco2e: cbamBenchmarkPriceInr,
        annual_financial_exposure_inr: Math.round(cbamFinancialExposureInr),
        annual_financial_exposure_lakhs: Number((cbamFinancialExposureInr / 100000.0).toFixed(2))
      },
      ccts: {
        is_covered_sector: ['iron_steel', 'cement', 'textile_dyeing', 'chemicals'].includes(profile.sector_key),
        obligation_status: profile.annual_production_tonnes > 10000 ? 'MANDATORY_MONITORING' : 'VOLUNTARY_CREDITING'
      },
      brsr_core: {
        scope1_reported: true,
        scope2_reported: true,
        scope3_reported: footprint.scope3.base > 0,
        uncertainty_band_declared: true,
        verification_tier: 'VERIFIED_OFFICIAL_BASELINE'
      }
    };
  }

  generateHeadline(footprint, leaks, macc, profile) {
    const total = footprint.total_footprint.base;
    const topLeak = leaks[0] || null;
    const cashPos = macc.cash_positive_summary;

    let leakDesc = 'None detected';
    if (topLeak) {
      leakDesc = `${topLeak.stream_name.replace(/_/g, ' ')} (${topLeak.footprint_share_pct}% of total, ${topLeak.recoverable_to_median_tco2e} tCO2e recoverable)`;
    }

    return {
      annual_footprint_tco2e: Math.round(total),
      annual_footprint_band: `${Math.round(footprint.total_footprint.low)} – ${Math.round(footprint.total_footprint.high)} tCO2e (±${footprint.total_footprint.uncertainty_pct}%)`,
      top_leak_stream: leakDesc,
      cash_positive_portfolio_benefit_cr: Number((cashPos.total_annual_benefit_inr / 10000000.0).toFixed(2)),
      cash_positive_abatement_tonnes: cashPos.total_portfolio_abatement_tco2e,
      cash_positive_abatement_pct: cashPos.abatement_pct_of_footprint,
      blended_payback_months: cashPos.blended_payback_months,
      summary_statement: `Annual emissions of ${Math.round(total).toLocaleString('en-IN')} tCO2e. Identified ₹${(cashPos.total_annual_benefit_inr / 10000000.0).toFixed(2)} Cr/year in net savings via ${cashPos.count} cash-positive circular interventions with a ${cashPos.blended_payback_months}-month blended payback.`
    };
  }
}

module.exports = { CarbonEngine };
