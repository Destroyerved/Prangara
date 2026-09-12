/**
 * PRANGARA Carbon Engine — Marginal Abatement Cost Curve (MACC)
 * Matches 30 circular interventions, checks physical/regulatory refusal rules,
 * evaluates 5 distinct financial savings models, and computes sequential interaction de-rating.
 */

const fs = require('fs');
const path = require('path');

function capitalRecoveryFactor(r, n) {
  if (r <= 0 || n <= 0) return 1.0 / Math.max(1, n);
  const factor = Math.pow(1.0 + r, n);
  return (r * factor) / (factor - 1.0);
}

class MACCRecommender {
  constructor(datasetRoot) {
    this.root = datasetRoot || path.resolve(__dirname, '..', '..');
    this.interventions = [];
    this.loadInterventions();
  }

  loadInterventions() {
    const candidates = [
      path.join(this.root, 'datasets', 'data', 'clean', 'interventions_verified.json'),
      path.join(this.root, 'datasets', '02_circular_interventions_library', 'chakra_interventions.json'),
      path.join(this.root, 'datasets', 'data', 'clean', 'interventions_canonical.json')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.interventions = JSON.parse(fs.readFileSync(p, 'utf8'));
        return;
      }
    }
  }

  recommend(footprintResult, plantProfile) {
    const sectorKey = plantProfile.sector_key || plantProfile.sector || 'textile_dyeing';
    const revenueCr = Number(plantProfile.revenue_crores || 25.0);
    const costOfCapital = 0.12; // 12% MSME WACC

    // Stream totals map for abatement calculation
    const streamTotals = {};
    const streamBands = {};
    for (const st of (footprintResult.stream_objects || [])) {
      streamTotals[st.name] = st.tco2eBand.base;
      streamTotals[st.category] = (streamTotals[st.category] || 0) + st.tco2eBand.base;
      streamBands[st.name] = st.tco2eBand;
    }
    const totalFootprint = footprintResult.total_footprint.base || 1.0;
    streamTotals['material_ALL'] = footprintResult.scope3.base * 0.9;
    streamTotals['total_footprint'] = totalFootprint;

    const recommendations = [];
    const blockedInterventions = [];

    for (const item of this.interventions) {
      // 1. Sector Compatibility Check
      const applicable = item.applicable_sectors || [];
      const blockedSectors = item.constraints?.blocked_sectors || [];

      if (blockedSectors.includes(sectorKey)) {
        blockedInterventions.push({
          id: item.id,
          name: item.name,
          reason: item.constraints?.refusal_reason || `Incompatible with strict regulatory/process safety in sector ${sectorKey}`
        });
        continue;
      }

      if (applicable.length > 0 && !applicable.includes(sectorKey) && !applicable.includes('ALL')) {
        continue; // Not applicable to this sector
      }

      // 2. Target Stream Identification
      const target = item.target_stream;
      const streamVolume = streamTotals[target] || 0;
      if (streamVolume <= 0.001) {
        continue; // Plant has zero emissions in this target stream
      }

      // 3. Abatement Fraction & Caps
      let abatementFraction = item.abatement?.base || 0.10;
      const sectorCaps = item.constraints?.sector_caps || {};
      if (sectorCaps[sectorKey] !== undefined) {
        abatementFraction = Math.min(abatementFraction, sectorCaps[sectorKey]);
      }
      if (item.constraints?.max_substitution_pct) {
        abatementFraction = Math.min(abatementFraction, item.constraints.max_substitution_pct);
      }

      // Standalone abatement tonnes
      const standaloneAbatement = streamVolume * abatementFraction;
      if (standaloneAbatement <= 0.01) continue;

      // 4. Economics & Capital Recovery
      const capexBase = item.economics?.capex_value || 500000;
      const capexScale = revenueCr > 25.0 ? Math.pow(revenueCr / 25.0, 0.6) : 1.0;
      const capex = capexBase * capexScale;
      const lifetime = item.economics?.lifetime_years || 10;
      const crf = capitalRecoveryFactor(costOfCapital, lifetime);
      const annualizedCapex = capex * crf;

      // Savings Calculation based on model
      let annualGrossSaving = 0;
      let opexDelta = 0;
      const model = item.economics?.savings_model || 'avoided_purchase';

      if (model === 'avoided_purchase' || model === 'tariff_delta') {
        if (target.includes('electricity') || item.category === 'energy') {
          // kWh saved = (abatement / 0.716) * 1000 MWh
          const kwhSaved = (standaloneAbatement / 0.716) * 1000.0;
          annualGrossSaving = kwhSaved * 8.0; // ₹8/kWh tariff
          if (model === 'tariff_delta') {
            annualGrossSaving = kwhSaved * (8.0 - 4.2); // Tariff differential
          }
        } else {
          // Fuel savings proxy
          annualGrossSaving = standaloneAbatement * 12000.0;
        }
      } else if (model === 'price_delta') {
        // Circular material price delta savings
        annualGrossSaving = standaloneAbatement * 15000.0;
      } else if (model === 'fuel_switch') {
        // Fuel switch may have slightly higher fuel cost but big carbon drop
        annualGrossSaving = standaloneAbatement * 8500.0;
        opexDelta = capex * 0.04;
      }

      const netAnnualBenefit = annualGrossSaving - opexDelta;
      const lcoa = (annualizedCapex - netAnnualBenefit) / standaloneAbatement;
      const paybackMonths = netAnnualBenefit > 0 ? (capex / netAnnualBenefit) * 12.0 : 999.0;

      // 10-year Net Present Value (NPV)
      let npv = -capex;
      for (let y = 1; y <= lifetime; y++) {
        npv += netAnnualBenefit / Math.pow(1.0 + costOfCapital, y);
      }

      recommendations.push({
        id: item.id,
        name: item.name,
        category: item.category,
        target_stream: target,
        stream_total: streamVolume,
        standalone_abatement: Number(standaloneAbatement.toFixed(1)),
        portfolio_abatement: Number(standaloneAbatement.toFixed(1)), // will be de-rated
        abatement_fraction: abatementFraction,
        capex_inr: Math.round(capex),
        annual_saving_inr: Math.round(annualGrossSaving),
        annual_net_benefit_inr: Math.round(netAnnualBenefit),
        lcoa_inr_per_tco2e: Math.round(lcoa),
        payback_months: Number(paybackMonths.toFixed(1)),
        npv_inr: Math.round(npv),
        is_cash_positive: lcoa <= 0,
        difficulty_1_to_5: item.difficulty || 2,
        savings_model: model,
        evidence_notes: item.evidence_notes || []
      });
    }

    // 5. Interaction De-Rating
    // Sort by LCOA (cheapest first)
    recommendations.sort((a, b) => a.lcoa_inr_per_tco2e - b.lcoa_inr_per_tco2e);

    const remainingStreamShare = {};
    for (const rec of recommendations) {
      const stream = rec.target_stream;
      if (remainingStreamShare[stream] === undefined) {
        remainingStreamShare[stream] = 1.0;
      }

      const deratingFactor = remainingStreamShare[stream];
      rec.portfolio_abatement = Number((rec.standalone_abatement * deratingFactor).toFixed(1));

      // Update remaining stream share
      remainingStreamShare[stream] = Math.max(0.0, deratingFactor * (1.0 - rec.abatement_fraction));
    }

    // Filter cash-positive subset
    const cashPositive = recommendations.filter(r => r.is_cash_positive);
    const totalCapex = cashPositive.reduce((sum, r) => sum + r.capex_inr, 0);
    const totalBenefit = cashPositive.reduce((sum, r) => sum + r.annual_net_benefit_inr, 0);
    const totalAbatement = cashPositive.reduce((sum, r) => sum + r.portfolio_abatement, 0);

    return {
      recommendations,
      cash_positive_summary: {
        count: cashPositive.length,
        total_capex_inr: totalCapex,
        total_annual_benefit_inr: totalBenefit,
        total_portfolio_abatement_tco2e: Number(totalAbatement.toFixed(1)),
        blended_payback_months: totalBenefit > 0 ? Number(((totalCapex / totalBenefit) * 12.0).toFixed(1)) : 0,
        abatement_pct_of_footprint: Number(((totalAbatement / totalFootprint) * 100.0).toFixed(1))
      },
      blocked_interventions: blockedInterventions
    };
  }
}

module.exports = { MACCRecommender };
