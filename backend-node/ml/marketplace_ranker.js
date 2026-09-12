/**
 * PRANGARA Advanced ML Engine
 * Module 4: Multi-Attribute Utility & Carbon-Delta Marketplace Ranker
 *
 * Evaluates circular material listings and implementation providers:
 * 1. Net Carbon Delta: avoided virgin material carbon minus transport logistics footprint.
 * 2. Multi-Attribute Utility Ranking (Delivered Price, Net Carbon ROI, Vendor Verification Tier).
 * 3. ESCO Provider Matching (BEE Grade, Proximity, Technology Match).
 */

const { haversineDistance, FREIGHT_FACTORS } = require('./logistics_optimizer');

class MarketplaceRanker {
  constructor() {}

  /**
   * Ranks circular raw material listings for a buyer plant.
   */
  rankMaterialListings(listings, buyerGps, targetStreamKey, virginBaselineFactor) {
    if (!listings || listings.length === 0) return [];

    const ranked = listings.map(item => {
      const distanceKm = haversineDistance(buyerGps[0], buyerGps[1], item.latitude, item.longitude);
      const quantityTonnes = item.available_tonnes || item.quantity_tonnes || 10.0;

      // 1. Gross Carbon Avoided (virgin EF vs circular byproduct EF)
      const virginEf = virginBaselineFactor || 2.20; // e.g. 2.20 tCO2e/t
      const circularEf = item.lifecycle_carbon_factor || (virginEf * 0.25); // circular material ~75% lower
      const grossAvoidedTco2e = Math.max(0, (virginEf - circularEf) * quantityTonnes);

      // 2. Transport Freight Carbon Penalty
      const freightCarbonTco2e = (distanceKm * quantityTonnes * FREIGHT_FACTORS.rigid_truck_diesel_16t) / 1000.0;
      const netCarbonAvoidedTco2e = Math.max(0, grossAvoidedTco2e - freightCarbonTco2e);

      // 3. Delivered Cost
      const basePriceInr = item.price_inr_per_tonne || 15000;
      const freightCostInr = (distanceKm * 40.0) / Math.max(1, quantityTonnes);
      const totalDeliveredCostPerT = basePriceInr + freightCostInr;

      // 4. Carbon ROI (kg CO2e avoided per 1000 INR spent)
      const carbonRoi = totalDeliveredCostPerT > 0 ? (netCarbonAvoidedTco2e * 1000.0 * 1000.0) / (totalDeliveredCostPerT * quantityTonnes) : 0;

      // 5. Composite Utility Score (0 - 100)
      const distancePenalty = Math.min(30, (distanceKm / 500.0) * 30);
      const carbonScore = Math.min(50, (netCarbonAvoidedTco2e / (virginEf * quantityTonnes)) * 50);
      const trustBonus = item.digital_passport_verified ? 20 : 5;
      const compositeScore = Number(Math.max(0, Math.min(100, (carbonScore + trustBonus + (30 - distancePenalty)))).toFixed(1));

      return {
        listing_id: item.listing_id || item.id,
        material_name: item.material_name || item.waste_type,
        supplier_name: item.supplier_name || item.generator_name,
        available_tonnes: quantityTonnes,
        distance_km: Math.round(distanceKm),
        delivered_price_per_tonne_inr: Math.round(totalDeliveredCostPerT),
        gross_avoided_tco2e: Number(grossAvoidedTco2e.toFixed(2)),
        transport_carbon_penalty_tco2e: Number(freightCarbonTco2e.toFixed(2)),
        net_carbon_saved_tco2e: Number(netCarbonAvoidedTco2e.toFixed(2)),
        carbon_roi_kg_per_1k_inr: Number(carbonRoi.toFixed(1)),
        composite_utility_score: compositeScore,
        digital_passport_verified: !!item.digital_passport_verified
      };
    });

    // Sort by composite utility score descending
    ranked.sort((a, b) => b.composite_utility_score - a.composite_utility_score);
    return ranked;
  }

  /**
   * Ranks verified implementation providers (ESCOs, technology partners) for a plant intervention.
   */
  rankProviders(providers, plantDistrict, targetCategory, targetInterventionId) {
    if (!providers || providers.length === 0) return [];

    return providers.map(p => {
      let matchScore = 50;

      // Category / Tech match
      if (p.categories_served && p.categories_served.includes(targetCategory)) {
        matchScore += 25;
      }

      // Accreditation Tier
      if (p.bee_accreditation_grade === 'Grade-1 ESCO') {
        matchScore += 20;
      } else if (p.bee_accreditation_grade === 'Empanelled Auditor') {
        matchScore += 12;
      }

      // District / State Proximity
      if (p.headquarters_district === plantDistrict || (p.states_covered && p.states_covered.includes(plantDistrict))) {
        matchScore += 15;
      }

      return {
        provider_id: p.provider_id,
        name: p.name,
        bee_grade: p.bee_accreditation_grade,
        states_covered: p.states_covered,
        completed_projects: p.completed_projects_count || 12,
        avg_verified_savings_pct: p.avg_verified_savings_pct || 18.5,
        rating: p.rating || 4.8,
        match_score: Math.min(100, matchScore)
      };
    }).sort((a, b) => b.match_score - a.match_score);
  }
}

module.exports = { MarketplaceRanker };
