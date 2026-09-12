/**
 * PRANGARA Advanced ML Engine
 * Module 3: Empirical Bayesian Benchmark Learning & Flywheel
 *
 * Updates static literature sector benchmarks with live empirical factory assessments:
 *   mu_updated = (n / (n + nu)) * x_bar_cluster + (nu / (n + nu)) * mu_prior
 * where nu = 8 prevents premature sample drift.
 * Filters outliers via Interquartile Range (IQR) and excludes querying plant (jackknife).
 */

class BayesianBenchmarkFlywheel {
  constructor(nuRegularizer = 8) {
    this.nu = nuRegularizer; // default weight of 8 observations given to statutory prior
  }

  /**
   * Updates sector prior benchmark percentiles with empirical observations.
   * @param {Object} priorBenchmark - { low, median, high } from BEE MSME study
   * @param {Array<number>} empiricalObservations - Array of measured intensities from live factories
   * @param {number} plantOwnValue - Value of querying plant to exclude (jackknife)
   */
  updateBenchmark(priorBenchmark, empiricalObservations = [], plantOwnValue = null) {
    const priorMedian = priorBenchmark.median || priorBenchmark.base || 100.0;
    const priorLow = priorBenchmark.low || priorMedian * 0.75;
    const priorHigh = priorBenchmark.high || priorMedian * 1.35;

    // 1. Jackknife: Exclude querying plant's own value
    let sample = [...empiricalObservations];
    if (plantOwnValue !== null) {
      const idx = sample.indexOf(plantOwnValue);
      if (idx !== -1) sample.splice(idx, 1);
    }

    // 2. Outlier Rejection via Interquartile Range (IQR)
    sample = this.filterOutliers(sample);
    const n = sample.length;

    if (n === 0) {
      return {
        sample_size: 0,
        prior_median: priorMedian,
        updated_median: priorMedian,
        updated_p25: priorLow,
        updated_p75: priorHigh,
        shrinkage_weight_empirical: 0.0,
        status: 'STATUTORY_PRIOR_ONLY'
      };
    }

    // 3. Calculate Sample Statistics
    sample.sort((a, b) => a - b);
    const sampleMean = sample.reduce((sum, v) => sum + v, 0) / n;
    const sampleP25 = this.percentile(sample, 0.25);
    const sampleP50 = this.percentile(sample, 0.50);
    const sampleP75 = this.percentile(sample, 0.75);

    // 4. Bayesian Shrinkage Formulation
    const weightEmpirical = n / (n + this.nu);
    const weightPrior = this.nu / (n + this.nu);

    const updatedMedian = (weightEmpirical * sampleP50) + (weightPrior * priorMedian);
    const updatedP25 = (weightEmpirical * sampleP25) + (weightPrior * priorLow);
    const updatedP75 = (weightEmpirical * sampleP75) + (weightPrior * priorHigh);

    return {
      sample_size_valid: n,
      prior_median: Number(priorMedian.toFixed(2)),
      sample_observed_median: Number(sampleP50.toFixed(2)),
      updated_median: Number(updatedMedian.toFixed(2)),
      updated_p25: Number(updatedP25.toFixed(2)),
      updated_p75: Number(updatedP75.toFixed(2)),
      shrinkage_weight_empirical_pct: Number((weightEmpirical * 100).toFixed(1)),
      shrinkage_weight_prior_pct: Number((weightPrior * 100).toFixed(1)),
      status: n >= 15 ? 'ROBUST_BAYESIAN_CONVERGED' : 'TRANSITIONAL_BAYESIAN_SHRINKAGE'
    };
  }

  filterOutliers(arr) {
    if (arr.length < 4) return arr;
    const sorted = [...arr].sort((a, b) => a - b);
    const q1 = this.percentile(sorted, 0.25);
    const q3 = this.percentile(sorted, 0.75);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    return sorted.filter(v => v >= lower && v <= upper);
  }

  percentile(sortedArr, p) {
    const idx = (sortedArr.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
  }
}

module.exports = { BayesianBenchmarkFlywheel };
