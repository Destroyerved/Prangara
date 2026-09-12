/**
 * PRANGARA Compliance Engine — Rule-Pack Evaluator
 * Evaluates live plant operational profiles against:
 * 1. European Union Carbon Border Adjustment Mechanism (EU CBAM)
 * 2. India Carbon Credit Trading Scheme (India CCTS / BEE)
 * 3. SEBI Business Responsibility and Sustainability Reporting (BRSR Core)
 */

const fs = require('fs');
const path = require('path');

class ComplianceEvaluator {
  constructor(datasetRoot) {
    this.root = datasetRoot || path.resolve(__dirname, '..', '..');
    this.rulePacks = {};
    this.loadRulePacks();
  }

  loadRulePacks() {
    const p = path.join(this.root, 'datasets', 'data', 'clean', 'compliance_rule_packs');
    const cbamFile = path.join(p, 'cbam_rule_pack.json');
    const cctsFile = path.join(p, 'ccts_rule_pack.json');
    const brsrFile = path.join(p, 'sebi_brsr_rule_pack.json');

    if (fs.existsSync(cbamFile)) this.rulePacks['CBAM'] = JSON.parse(fs.readFileSync(cbamFile, 'utf8'));
    if (fs.existsSync(cctsFile)) this.rulePacks['CCTS'] = JSON.parse(fs.readFileSync(cctsFile, 'utf8'));
    if (fs.existsSync(brsrFile)) this.rulePacks['BRSR'] = JSON.parse(fs.readFileSync(brsrFile, 'utf8'));
  }

  evaluate(plantProfile, assessmentResult) {
    const cases = [];
    const sectorKey = plantProfile.sector_key || plantProfile.sector || 'textile_dyeing';
    const exportEuPct = Number(plantProfile.eu_export_share_pct || plantProfile.export_eu_pct || 0);
    const annualProdT = Number(plantProfile.annual_production_tonnes || 1000);
    const footprint = assessmentResult.footprint;

    // 1. Evaluate EU CBAM
    const cbamCoveredSectors = ['iron_steel', 'aluminium', 'cement', 'chemicals'];
    const isCbamSector = cbamCoveredSectors.includes(sectorKey);

    if (isCbamSector && exportEuPct > 0) {
      const directEmissions = footprint.scope1.base + footprint.scope2.base;
      const exposedTonnes = directEmissions * (exportEuPct / 100.0);
      const benchmarkPriceInr = 7650.0; // €85/tCO2e @ ₹90/€
      const financialExposureInr = exposedTonnes * benchmarkPriceInr;

      cases.push({
        regulation: 'EU CBAM (Definitive Regime)',
        status: 'HIGH_EXPOSURE_RISK',
        severity: 'critical',
        deadline: '2026-01-01 (Active Definitive Period)',
        description: `Exporting ${exportEuPct}% of output to EU under covered sector '${sectorKey}'. Scope 1 and Scope 2 emissions are subject to CBAM certificate surrender.`,
        key_metrics: {
          exposed_tco2e_annual: Number(exposedTonnes.toFixed(1)),
          estimated_annual_exposure_inr: Math.round(financialExposureInr),
          reference_certificate_price: '€85 / tCO2e (₹7,650/tCO2e)'
        },
        action_required: 'Execute verified accredited verification of embedded specific emissions and submit declaration via authorized EU declarant.'
      });
    } else if (exportEuPct > 0) {
      cases.push({
        regulation: 'EU CBAM Scope Extension Watch',
        status: 'MONITORING_PHASE',
        severity: 'low',
        deadline: '2028-01-01',
        description: `Sector '${sectorKey}' is under EU review for CBAM scope expansion to polymers, downstream textiles, and specialty manufacturing.`,
        key_metrics: { current_eu_export_pct: exportEuPct },
        action_required: 'Maintain auditable GHG Protocol Scope 1/2 inventory in preparation for phase-2 scope inclusions.'
      });
    }

    // 2. Evaluate India CCTS (Carbon Credit Trading Scheme)
    const cctsEnergyThresholdGj = 30000; // ~700 toe threshold for designated consumers
    const totalThermalGj = (footprint.scope1.base / 0.095); // approx GJ
    const isObligatedCcts = totalThermalGj >= cctsEnergyThresholdGj || annualProdT >= 25000;

    cases.push({
      regulation: 'India CCTS (BEE / Ministry of Power)',
      status: isObligatedCcts ? 'OBLIGATED_ENTITY_MONITORING' : 'VOLUNTARY_DOMESTIC_OFFSET_POTENTIAL',
      severity: isObligatedCcts ? 'warning' : 'info',
      deadline: '2026-04-01 (Compliance Year)',
      description: isObligatedCcts
        ? `Plant energy consumption exceeds CCTS statutory baseline threshold. Mandatory Greenhouse Gas Emission Intensity (GEI) reduction trajectory applies.`
        : `Facility is eligible to earn verified Carbon Credit Certificates (CCCs) under the CCTS Voluntary Offset mechanism for circular interventions.`,
      key_metrics: {
        current_gei_tco2e_per_tonne: Number((footprint.gate_to_gate_footprint.base / annualProdT).toFixed(3)),
        ccts_ccc_credit_potential_annual: Number((assessmentResult.macc.cash_positive_summary.total_portfolio_abatement_tco2e).toFixed(1))
      },
      action_required: isObligatedCcts ? 'Submit baseline GEI report to Bureau of Energy Efficiency (BEE).' : 'Register circular heat recovery / biomass projects with BEE CCTS Registry to generate tradable credits.'
    });

    // 3. Evaluate SEBI BRSR Core
    cases.push({
      regulation: 'SEBI BRSR Core (Value Chain Circularity)',
      status: footprint.scope3.base > 0 ? 'COMPLIANT_VALUE_CHAIN_READY' : 'DATA_INCOMPLETE',
      severity: footprint.scope3.base > 0 ? 'good' : 'warning',
      deadline: 'FY 2025-26 Mandatory Value Chain Assurance',
      description: 'Listed Indian corporates require certified Scope 1, 2, and 3 footprint assurance from their top 250 MSME supply chain partners.',
      key_metrics: {
        scope1_coverage_pct: 100,
        scope2_coverage_pct: 100,
        scope3_coverage_pct: footprint.scope3.base > 0 ? 100 : 0
      },
      action_required: 'Export PRANGARA ISO 14064-aligned Scope 1/2/3 Verification Dossier for customer ESG compliance review.'
    });

    return cases;
  }
}

module.exports = { ComplianceEvaluator };
