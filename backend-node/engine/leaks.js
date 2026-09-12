/**
 * PRANGARA Carbon Engine — Leak Detection
 * 3-Tier Rule-Governed Carbon Leak Detector
 * Compares plant process streams against sector peer percentiles (p25, p50, p75).
 */

class LeakDetector {
  constructor(sectorsData) {
    this.sectors = sectorsData || {};
  }

  detect(footprintResult, sectorKey, annualProduction) {
    const leaks = [];
    const sector = this.sectors[sectorKey] || null;
    const totalTco2e = footprintResult.total_footprint.base || 1.0;
    const streams = footprintResult.stream_objects || [];

    // Map benchmark values if sector found
    const elecMedian = sector?.benchmarks?.electricity_kwh_per_t?.median || 200;
    const elecP75 = sector?.benchmarks?.electricity_kwh_per_t?.p75 || (elecMedian * 1.35);
    const elecP25 = sector?.benchmarks?.electricity_kwh_per_t?.p25 || (elecMedian * 0.75);

    const thermMedian = sector?.benchmarks?.thermal_gj_per_t?.median || 5.5;
    const thermP75 = sector?.benchmarks?.thermal_gj_per_t?.p75 || (thermMedian * 1.35);
    const thermP25 = sector?.benchmarks?.thermal_gj_per_t?.p25 || (thermMedian * 0.75);

    for (const stream of streams) {
      const share = stream.tco2eBand.base / totalTco2e;
      const tco2eVal = stream.tco2eBand.base;

      // 1. Electricity Stream Benchmarking
      if (stream.category === 'electricity') {
        const kwhIntensity = (stream.physicalQty * 1000.0) / annualProduction;
        const peerPercentile = this.calculatePercentile(kwhIntensity, elecP25, elecMedian, elecP75);

        if (kwhIntensity > elecP75) {
          const excessKwhPerT = kwhIntensity - elecMedian;
          const recoverableTco2e = (excessKwhPerT * annualProduction * 0.001 * 0.716); // at median
          leaks.push({
            rule: 'benchmark_breach',
            severity: kwhIntensity > elecP75 * 1.25 ? 'critical' : 'warning',
            stream_name: stream.name,
            target_category: 'electricity',
            measured_value: Number(kwhIntensity.toFixed(1)),
            unit: 'kWh/tonne',
            peer_percentile: peerPercentile,
            peer_median: elecMedian,
            peer_p75: elecP75,
            footprint_share_pct: Number((share * 100).toFixed(1)),
            recoverable_to_median_tco2e: Math.max(0, Number(recoverableTco2e.toFixed(1))),
            summary: `Electricity intensity (${kwhIntensity.toFixed(0)} kWh/t) exceeds sector p75 (${elecP75.toFixed(0)} kWh/t) at percentile p${peerPercentile}.`
          });
          continue;
        } else if (share > 0.15 && kwhIntensity > elecMedian) {
          leaks.push({
            rule: 'material_concentration',
            severity: 'moderate',
            stream_name: stream.name,
            target_category: 'electricity',
            measured_value: Number(kwhIntensity.toFixed(1)),
            unit: 'kWh/tonne',
            peer_percentile: peerPercentile,
            peer_median: elecMedian,
            peer_p75: elecP75,
            footprint_share_pct: Number((share * 100).toFixed(1)),
            recoverable_to_median_tco2e: Math.max(0, Number(((kwhIntensity - elecMedian) * annualProduction * 0.001 * 0.716).toFixed(1))),
            summary: `High electricity concentration (${(share * 100).toFixed(1)}% of footprint) operating above sector median at p${peerPercentile}.`
          });
          continue;
        }
      }

      // 2. Thermal Fuel Stream Benchmarking
      if (stream.category === 'thermal_fuel') {
        // Approximate GJ from physical quantity
        const gjIntensity = (stream.physicalQty * 15.0) / annualProduction; // avg proxy NCV
        const peerPercentile = this.calculatePercentile(gjIntensity, thermP25, thermMedian, thermP75);

        if (gjIntensity > thermP75) {
          const excessGj = gjIntensity - thermMedian;
          const recoverable = excessGj * annualProduction * 0.095; // ~0.095 tCO2/GJ
          leaks.push({
            rule: 'benchmark_breach',
            severity: 'critical',
            stream_name: stream.name,
            target_category: 'thermal_fuel',
            measured_value: Number(gjIntensity.toFixed(2)),
            unit: 'GJ/tonne',
            peer_percentile: peerPercentile,
            peer_median: thermMedian,
            peer_p75: thermP75,
            footprint_share_pct: Number((share * 100).toFixed(1)),
            recoverable_to_median_tco2e: Math.max(0, Number(recoverable.toFixed(1))),
            summary: `Process heat consumption exceeds sector p75 at percentile p${peerPercentile}.`
          });
          continue;
        }
      }

      // 3. Upstream Material / Scope 3 Structural Hotspots
      if (share >= 0.25) {
        leaks.push({
          rule: 'structural_hotspot',
          severity: share >= 0.50 ? 'critical' : 'warning',
          stream_name: stream.name,
          target_category: stream.category,
          measured_value: Number(tco2eVal.toFixed(1)),
          unit: 'tCO2e',
          peer_percentile: Math.min(95, Math.round(50 + share * 50)),
          peer_median: Number((tco2eVal * 0.6).toFixed(1)),
          peer_p75: Number((tco2eVal * 0.8).toFixed(1)),
          footprint_share_pct: Number((share * 100).toFixed(1)),
          recoverable_to_median_tco2e: Number((tco2eVal * 0.25).toFixed(1)), // 25% circular substitution potential
          summary: `Dominant emission hotspot: ${stream.name} represents ${(share * 100).toFixed(1)}% of entire plant carbon footprint.`
        });
      }
    }

    // Sort leaks: critical first, then highest recoverable tonnes
    leaks.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (b.severity === 'critical' && a.severity !== 'critical') return 1;
      return b.recoverable_to_median_tco2e - a.recoverable_to_median_tco2e;
    });

    return leaks;
  }

  calculatePercentile(value, p25, p50, p75) {
    if (value <= p25) {
      const pct = 1 + (value / Math.max(0.001, p25)) * 24;
      return Math.max(1, Math.min(25, Math.round(pct)));
    } else if (value <= p50) {
      const pct = 25 + ((value - p25) / Math.max(0.001, p50 - p25)) * 25;
      return Math.max(25, Math.min(50, Math.round(pct)));
    } else if (value <= p75) {
      const pct = 50 + ((value - p50) / Math.max(0.001, p75 - p50)) * 25;
      return Math.max(50, Math.min(75, Math.round(pct)));
    } else {
      const pct = 75 + Math.min(24, ((value - p75) / Math.max(0.001, p75 * 0.5)) * 24);
      return Math.max(75, Math.min(99, Math.round(pct)));
    }
  }
}

module.exports = { LeakDetector };
