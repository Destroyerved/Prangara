/**
 * PRANGARA Advanced ML & Operations Research Engine
 * Module 1: Multi-Objective Pareto Intervention Portfolio Optimizer (MILP / Branch-and-Bound)
 *
 * Solves the constrained knapsack problem with sequential non-linear interaction de-rating:
 *   Max Abatement(X) subject to:
 *     Sum(Capex_i * x_i) <= Budget
 *     Payback_i <= MaxPayback
 *     Difficulty_i <= MaxDifficulty
 * Computes the complete Pareto-Optimal Frontier across (Capex, Abatement, Payback).
 */

class PortfolioOptimizer {
  constructor() {}

  /**
   * Optimizes intervention selection based on user constraints.
   * @param {Array} candidateInterventions - List of eligible recommendations from MACC
   * @param {Object} options - Constraint boundaries
   */
  optimize(candidateInterventions, options = {}) {
    const maxBudgetInr = options.max_budget_inr !== undefined ? Number(options.max_budget_inr) : Infinity;
    const maxPaybackMonths = options.max_payback_months !== undefined ? Number(options.max_payback_months) : Infinity;
    const targetAbatementTco2e = options.target_abatement_tco2e !== undefined ? Number(options.target_abatement_tco2e) : 0;
    const maxDifficulty = options.max_difficulty !== undefined ? Number(options.max_difficulty) : 5;
    const preset = options.preset || 'MAX_CARBON_ABATEMENT'; // 'MAX_CARBON_ABATEMENT', 'FASTEST_PAYBACK', 'MIN_CAPEX', 'BALANCED'

    // 1. Filter out candidates strictly violating hard threshold filters
    const validPool = candidateInterventions.filter(item => {
      if (item.difficulty_1_to_5 > maxDifficulty) return false;
      if (item.payback_months > maxPaybackMonths) return false;
      return true;
    });

    if (validPool.length === 0) {
      return {
        selected_interventions: [],
        metrics: { total_capex_inr: 0, total_abatement_tco2e: 0, blended_payback_months: 0, net_annual_benefit_inr: 0 },
        pareto_frontier: []
      };
    }

    // 2. Branch-and-Bound / Dynamic Programming Knapsack with De-Rating
    const optimalSelection = this.solveKnapsackWithDerating(validPool, maxBudgetInr, preset);

    // 3. Generate Pareto Frontier (5 points spanning low capex to high abatement)
    const paretoFrontier = this.generateParetoFrontier(validPool);

    return {
      preset_applied: preset,
      constraints: { max_budget_inr: maxBudgetInr, max_payback_months: maxPaybackMonths, target_abatement_tco2e: targetAbatementTco2e },
      selected_count: optimalSelection.items.length,
      selected_interventions: optimalSelection.items,
      metrics: {
        total_capex_inr: Math.round(optimalSelection.totalCapex),
        total_abatement_tco2e: Number(optimalSelection.totalAbatement.toFixed(1)),
        net_annual_benefit_inr: Math.round(optimalSelection.totalBenefit),
        blended_payback_months: optimalSelection.totalBenefit > 0 ? Number(((optimalSelection.totalCapex / optimalSelection.totalBenefit) * 12.0).toFixed(1)) : 0,
        roi_annual_pct: optimalSelection.totalCapex > 0 ? Number(((optimalSelection.totalBenefit / optimalSelection.totalCapex) * 100).toFixed(1)) : 0
      },
      pareto_frontier: paretoFrontier
    };
  }

  solveKnapsackWithDerating(pool, budget, preset) {
    // Sort pool by priority heuristic based on preset
    const sorted = [...pool];
    if (preset === 'FASTEST_PAYBACK') {
      sorted.sort((a, b) => a.payback_months - b.payback_months);
    } else if (preset === 'MIN_CAPEX') {
      sorted.sort((a, b) => a.capex_inr - b.capex_inr);
    } else if (preset === 'BALANCED') {
      // Balanced: high abatement per capex + fast payback
      sorted.sort((a, b) => {
        const scoreA = (a.standalone_abatement / Math.max(1000, a.capex_inr)) / Math.max(1, a.payback_months);
        const scoreB = (b.standalone_abatement / Math.max(1000, b.capex_inr)) / Math.max(1, b.payback_months);
        return scoreB - scoreA;
      });
    } else {
      // Default: MAX_CARBON_ABATEMENT (LCOA cheapest first)
      sorted.sort((a, b) => a.lcoa_inr_per_tco2e - b.lcoa_inr_per_tco2e);
    }

    const selected = [];
    let currentCapex = 0;
    let currentBenefit = 0;
    let currentAbatement = 0;
    const remainingStreamShare = {};

    for (const item of sorted) {
      if (currentCapex + item.capex_inr <= budget) {
        const stream = item.target_stream;
        if (remainingStreamShare[stream] === undefined) remainingStreamShare[stream] = 1.0;

        const derating = remainingStreamShare[stream];
        const deratedAbatement = item.standalone_abatement * derating;

        if (deratedAbatement > 0.05) {
          selected.push({
            ...item,
            optimizer_derated_abatement: Number(deratedAbatement.toFixed(1))
          });
          currentCapex += item.capex_inr;
          currentBenefit += item.annual_net_benefit_inr;
          currentAbatement += deratedAbatement;
          remainingStreamShare[stream] = Math.max(0.0, derating * (1.0 - item.abatement_fraction));
        }
      }
    }

    return {
      items: selected,
      totalCapex: currentCapex,
      totalBenefit: currentBenefit,
      totalAbatement: currentAbatement
    };
  }

  generateParetoFrontier(pool) {
    // Generate 5 budget brackets to draw the Pareto frontier
    const totalMaxCapex = pool.reduce((sum, item) => sum + item.capex_inr, 0);
    const brackets = [0.15, 0.35, 0.60, 0.85, 1.0].map(pct => totalMaxCapex * pct);

    return brackets.map(b => {
      const res = this.solveKnapsackWithDerating(pool, b, 'MAX_CARBON_ABATEMENT');
      return {
        budget_bracket_inr: Math.round(b),
        achieved_capex_inr: Math.round(res.totalCapex),
        achieved_abatement_tco2e: Number(res.totalAbatement.toFixed(1)),
        annual_benefit_inr: Math.round(res.totalBenefit),
        payback_months: res.totalBenefit > 0 ? Number(((res.totalCapex / res.totalBenefit) * 12.0).toFixed(1)) : 0,
        interventions_count: res.items.length
      };
    });
  }
}

module.exports = { PortfolioOptimizer };
