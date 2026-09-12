/**
 * Live API Adapter
 * Translates between FastAPI backend engine outputs and canonical frontend domain schemas.
 * Adheres strictly to the field-by-field audit in ROADMAP.md §W2.
 */

function deriveBenchmarkUnit(name: string): string {
  if (name.includes("kwh")) return "kWh/t";
  if (name.includes("gj")) return "GJ/t";
  if (name.includes("m3")) return "m³/t";
  if (name.includes("tco2e")) return "tCO₂e/t";
  return "unit/t";
}

export const adaptSector = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object") return raw;
  const s = raw as Record<string, any>;

  // If benchmarks is a dictionary (from engine/reference data), convert to array of benchmark objects
  let benchmarks = s.benchmarks;
  if (benchmarks && typeof benchmarks === "object" && !Array.isArray(benchmarks)) {
    benchmarks = Object.entries(benchmarks).map(([k, v]: [string, any]) => ({
      name: k.replace(/_/g, " "),
      unit: deriveBenchmarkUnit(k),
      p25: v?.p25 ?? null,
      p50: v?.p50 ?? null,
      p75: v?.p75 ?? null,
    }));
  } else if (!Array.isArray(benchmarks)) {
    benchmarks = [];
  }

  // Ensure demo_profile has all required fields for plantSchema
  const demo = s.demo_profile || {};
  const demo_profile = {
    name: demo.name || `${s.name || s.key} Demo Facility`,
    sector: s.key || demo.sector || "textile_dyeing",
    state: demo.state || s.state || "Tamil Nadu",
    annual_output_t: demo.annual_output_t ?? 2400,
    annual_revenue_cr: demo.annual_revenue_cr ?? 34,
    employees: demo.employees ?? 180,
    electricity_kwh: demo.electricity_kwh ?? 3000000,
    fuels: demo.fuels || {},
    materials: demo.materials || {},
    waste: demo.waste || {},
    freight: demo.freight || {},
    tariff: demo.tariff ?? 8,
    discount_rate: demo.discount_rate ?? 0.12,
    eu_export_share_pct: demo.eu_export_share_pct ?? 20,
  };

  return {
    key: s.key,
    name: s.name || s.key,
    cluster: s.cluster || s.name || "",
    state: s.state || demo_profile.state || "",
    demo_profile,
    benchmarks,
    regulatory_flags: Array.isArray(s.regulatory_flags) ? s.regulatory_flags : [],
  };
};

export const adaptSectors = (raw: unknown): unknown => {
  if (Array.isArray(raw)) return raw.map(adaptSector);
  if (raw && typeof raw === "object" && "sectors" in raw) {
    const list = (raw as { sectors: unknown[] }).sectors;
    if (Array.isArray(list)) return list.map(adaptSector);
  }
  return raw;
};

export const adaptReference = (raw: unknown): unknown => {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return raw;

  const r = raw as Record<string, any>;
  if (r.groups && typeof r.groups === "object") {
    const flattened: any[] = [];
    for (const [groupName, items] of Object.entries(r.groups)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        let scope = "1";
        if (item.scope) scope = String(item.scope);
        else if (groupName === "Electricity" || item.key?.toLowerCase().includes("grid") || item.key?.toLowerCase().includes("electricity")) scope = "2";
        else if (groupName === "Material" || groupName === "Waste" || groupName === "Freight") scope = "3";

        flattened.push({
          key: item.key,
          name: item.label || item.name || item.key,
          group: groupName,
          scope,
          value: item.value ?? null,
          low: item.low ?? null,
          high: item.high ?? null,
          unit: item.unit || "",
          source: item.source || "PRANGARA Reference Registry",
          vintage: item.vintage || null,
          state: item.state || null,
        });
      }
    }
    return flattened;
  }
  return raw;
};

export const adaptAssessment = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Record<string, any>;

  // If already matches frontend schema canonical format
  if (r.footprint?.total?.base !== undefined && r.origin && r.plant && r.sankey && r.recommendations?.portfolios) {
    return r;
  }

  // Must have real assessment keys from engine
  const hasEngineStructure =
    (r.footprint?.total_tco2e !== undefined || r.footprint?.streams !== undefined || r.headline?.total_tco2e !== undefined) &&
    (r.recommendations !== undefined || r.leaks !== undefined || r.profile !== undefined);

  if (!hasEngineStructure) {
    return raw;
  }
  const profile = r.profile || r.plant || {};
  const plant = {
    name: profile.name || "Assessed Facility",
    sector: profile.sector || "textile_dyeing",
    state: profile.state || "Tamil Nadu",
    annual_output_t: profile.annual_output_t ?? 2400,
    annual_revenue_cr: profile.annual_revenue_cr ?? 34,
    employees: profile.employees ?? 180,
    electricity_kwh: profile.electricity_kwh ?? 3000000,
    fuels: profile.fuels || {},
    materials: profile.materials || {},
    waste: profile.waste || {},
    freight: profile.freight || {},
    tariff: profile.tariff ?? 8,
    discount_rate: profile.discount_rate ?? 0.12,
    eu_export_share_pct: profile.eu_export_share_pct ?? 25,
  };

  const origin = r.origin || {
    kind: "engine",
    note: r.claim_boundary || "Deterministic carbon engine assessment with version-stamped factors.",
    reference: `PRANGARA platform engine · v${r.versions?.engine || "2.0"}`,
  };

  // Footprint mapping
  const fp = r.footprint || {};
  const hl = r.headline || {};
  const totalBase = fp.total_tco2e ?? hl.total_tco2e ?? 0;
  const totalRange = fp.total_range || hl.total_range || { base: totalBase, low: totalBase, high: totalBase };
  const uncertaintyPct = fp.uncertainty_pct ?? hl.uncertainty_pct ?? null;

  const s1 = fp.scope1_tco2e ?? 0;
  const s2 = fp.scope2_tco2e ?? 0;
  const s3 = fp.scope3_tco2e ?? 0;
  const split = fp.scope_split_pct || {};

  const scopes = [
    { scope: "1" as const, total: s1, share_pct: split.scope1 ?? (totalBase > 0 ? (s1 / totalBase) * 100 : 0) },
    { scope: "2" as const, total: s2, share_pct: split.scope2 ?? (totalBase > 0 ? (s2 / totalBase) * 100 : 0) },
    { scope: "3" as const, total: s3, share_pct: split.scope3 ?? (totalBase > 0 ? (s3 / totalBase) * 100 : 0) },
  ];

  const streams = (fp.streams || []).map((s: any) => {
    const key = s.key || s.id || "";
    let cat = "fuel";
    if (key.startsWith("material_")) cat = "material";
    else if (key.startsWith("waste_")) cat = "waste";
    else if (key.startsWith("freight_")) cat = "freight";
    else if (key.includes("electricity")) cat = "electricity";
    else if (s.scope === 1) cat = "fuel";

    const factorKey = Array.isArray(s.factor_keys) && s.factor_keys.length > 0 ? s.factor_keys[0] : (s.factor_key || null);
    const rng = s.range || s.emissions || { base: s.tco2e ?? 0, low: s.tco2e ?? 0, high: s.tco2e ?? 0 };
    const workingDetail = s.detail ? Object.entries(s.detail).map(([k, v]) => `${k}: ${v}`).join(", ") : "";
    const working = s.source ? `${s.source}${workingDetail ? " · " + workingDetail : ""}` : (s.working || "Engine calculation");

    return {
      id: key,
      name: s.label || s.name || key,
      scope: String(s.scope || "1") as "1" | "2" | "3",
      category: cat,
      quantity: s.activity_qty ?? s.quantity ?? null,
      unit: s.activity_unit || s.unit || "unit",
      factor_key: factorKey,
      emissions: {
        base: rng.base ?? s.tco2e ?? 0,
        low: rng.low ?? rng.base ?? s.tco2e ?? 0,
        high: rng.high ?? rng.base ?? s.tco2e ?? 0,
      },
      share_pct: s.share_pct ?? 0,
      working,
    };
  });

  const intensities = fp.intensities || {};
  const gateToGate = intensities.gate_to_gate_tco2e_per_t ?? fp.gate_to_gate ?? null;
  const cradleToGate = intensities.cradle_to_gate_tco2e_per_t ?? fp.cradle_to_gate ?? null;
  const biogenic = fp.biogenic_co2_t ?? fp.biogenic_t ?? null;

  // Sankey mapping
  const rawNodes = r.sankey?.nodes || [];
  const rawLinks = r.sankey?.links || [];
  const nodeMap = new Map<number, string>();

  const nodes = rawNodes.map((n: any, idx: number) => {
    const id = n.id || `node_${idx}`;
    nodeMap.set(idx, id);

    let scope: "1" | "2" | "3" | "total" = "1";
    let streamId: string | null = null;

    if (n.kind === "total" || n.scope === "total" || n.name?.toLowerCase().includes("total")) {
      scope = "total";
    } else if (n.name?.includes("Scope 1") || n.scope === "1" || n.scope === 1) {
      scope = "1";
    } else if (n.name?.includes("Scope 2") || n.scope === "2" || n.scope === 2) {
      scope = "2";
    } else if (n.name?.includes("Scope 3") || n.scope === "3" || n.scope === 3) {
      scope = "3";
    } else {
      const match = streams.find((str: any) => str.name.toLowerCase() === n.name?.toLowerCase() || n.name?.toLowerCase().includes(str.name.toLowerCase()));
      if (match) {
        scope = match.scope;
        streamId = match.id;
      }
    }

    return {
      id,
      name: n.name || id,
      scope,
      stream_id: n.stream_id ?? streamId,
    };
  });

  const links = rawLinks.map((l: any) => ({
    source: typeof l.source === "number" ? (nodeMap.get(l.source) || `node_${l.source}`) : String(l.source),
    target: typeof l.target === "number" ? (nodeMap.get(l.target) || `node_${l.target}`) : String(l.target),
    value: l.value ?? 0,
    scope: String(l.scope || "1") as "1" | "2" | "3",
  }));

  // Leaks mapping
  const rawLeaks = r.leaks || {};
  const leakFindings = (rawLeaks.leaks || rawLeaks.findings || []).map((lk: any) => {
    const streamKey = lk.stream_key || lk.stream_id || "";
    const rule = (lk.rule === "benchmark_breach" || lk.rule === "material_concentration" || lk.rule === "structural_hotspot") ? lk.rule : "structural_hotspot";
    const sev = ["critical", "high", "moderate", "watch"].includes(lk.severity) ? lk.severity : "moderate";

    return {
      id: lk.id || `${streamKey}_${rule}`,
      stream_id: streamKey,
      name: lk.label || lk.name || streamKey,
      rule,
      severity: sev,
      share_pct: lk.share_pct ?? 0,
      actual: lk.actual ?? null,
      unit: lk.metric_unit || lk.unit || "",
      p25: lk.p25 ?? null,
      p50: lk.p50 ?? null,
      p75: lk.p75 ?? null,
      percentile: lk.percentile ?? null,
      recoverable_t: lk.gap_to_median_tco2e ?? lk.recoverable_t ?? null,
      reason: lk.finding || lk.reason || "Benchmark screening detection",
    };
  });

  // Recommendations mapping
  const recs = r.recommendations || {};
  const recItems = (recs.recommendations || recs.items || []).map((it: any) => {
    const payback = it.payback_yrs ?? it.payback_years ?? null;
    const diff = it.difficulty ?? 1;
    const isQuickWin = Boolean(it.quick_win || (payback != null && payback <= 2 && diff <= 2));

    let status: "cash_positive" | "net_cost" | "blocked" | "constraint_only" = "cash_positive";
    if (it.was_blocked) status = "blocked";
    else if (it.cash_positive || (it.net_annual_benefit_inr && it.net_annual_benefit_inr > 0)) status = "cash_positive";
    else if (it.substitution_capped) status = "constraint_only";
    else status = "net_cost";

    const rng = it.abatement_range || {
      base: it.portfolio_abatement_tco2e ?? it.abatement_tco2e ?? 0,
      low: it.abatement_tco2e ?? 0,
      high: it.abatement_tco2e ?? 0,
    };

    return {
      id: it.id,
      name: it.name,
      category: it.category || "process",
      target: it.target_stream || it.target || "",
      status,
      quick_win: isQuickWin,
      cap_pct: it.substitution_cap_pct ?? it.cap_pct ?? null,
      restriction: it.restriction_note ?? it.restriction ?? null,
      capex: it.capex_inr ?? it.capex ?? 0,
      net_benefit: it.net_annual_benefit_inr ?? it.net_benefit ?? 0,
      gross_saving: it.gross_annual_saving_inr ?? it.gross_saving ?? null,
      opex_delta: it.annual_opex_delta_inr ?? it.opex_delta ?? null,
      payback_years: payback,
      npv: it.npv_inr ?? it.npv ?? null,
      lcoa: it.lcoa_inr_per_tco2e ?? it.lcoa ?? 0,
      standalone_t: it.abatement_tco2e ?? it.standalone_t ?? 0,
      abatement_t: it.portfolio_abatement_tco2e ?? it.abatement_t ?? it.abatement_tco2e ?? 0,
      abatement_range: {
        base: rng.base ?? it.abatement_tco2e ?? 0,
        low: rng.low ?? rng.base ?? it.abatement_tco2e ?? 0,
        high: rng.high ?? rng.base ?? it.abatement_tco2e ?? 0,
      },
      difficulty: diff,
      disruption_days: it.disruption_days ?? null,
      confidence: (["high", "medium", "low"].includes(it.confidence) ? it.confidence : "medium") as "high" | "medium" | "low",
      savings_model: it.savings_model || "avoided_purchase",
      lifetime_years: it.lifetime_yrs ?? it.lifetime_years ?? null,
      physical_statement: it.physical_note || it.description || "",
      evidence: it.evidence || "Standard engineering calculation",
      caveats: Array.isArray(it.caveats) ? it.caveats : [],
    };
  });

  const blockedItems = (recs.blocked || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    category: b.category || "process",
    target: b.target_stream || b.target || "",
    status: "blocked" as const,
    quick_win: false,
    cap_pct: null,
    restriction: b.reason || b.restriction || "Infeasible for site parameters",
    capex: 0,
    net_benefit: 0,
    gross_saving: null,
    opex_delta: null,
    payback_years: null,
    npv: null,
    lcoa: 0,
    standalone_t: 0,
    abatement_t: 0,
    abatement_range: { base: 0, low: 0, high: 0 },
    difficulty: 5,
    disruption_days: null,
    confidence: "low" as const,
    savings_model: "none",
    lifetime_years: null,
    physical_statement: b.reason || "Rejected by feasibility rules",
    evidence: "Technical feasibility boundary",
    caveats: [b.reason || "Not applicable"],
  }));

  const maccCurve = recs.macc_curve || [];
  const allCurve = maccCurve.map((c: any) => ({
    id: c.id,
    abatement_t: c.width ?? 0,
    lcoa: c.height ?? 0,
  }));

  const portAll = recs.portfolio?.all || {};
  const portCash = recs.portfolio?.cash_positive_only || {};
  const portQuick = recs.portfolio?.quick_wins || {};

  const quickWinIds = new Set(recItems.filter((it: any) => it.quick_win).map((it: any) => it.id));
  const cashPosIds = new Set(recItems.filter((it: any) => it.status === "cash_positive").map((it: any) => it.id));

  const portfolios = {
    all: {
      ids: recItems.map((it: any) => it.id),
      count: portAll.count ?? recItems.length,
      abatement_t: portAll.abatement_tco2e ?? null,
      share_pct: portAll.abatement_pct ?? null,
      capex: portAll.capex_inr ?? null,
      net_benefit: portAll.net_annual_benefit_inr ?? null,
      payback_years: portAll.blended_payback_yrs ?? null,
      npv: portAll.npv_inr ?? null,
      curve: allCurve,
    },
    cash_positive_only: {
      ids: Array.from(cashPosIds),
      count: portCash.count ?? cashPosIds.size,
      abatement_t: portCash.abatement_tco2e ?? null,
      share_pct: portCash.abatement_pct ?? null,
      capex: portCash.capex_inr ?? null,
      net_benefit: portCash.net_annual_benefit_inr ?? null,
      payback_years: portCash.blended_payback_yrs ?? null,
      npv: portCash.npv_inr ?? null,
      curve: allCurve.filter((c: any) => cashPosIds.has(c.id)),
    },
    quick_wins: {
      ids: Array.from(quickWinIds),
      count: portQuick.count ?? quickWinIds.size,
      abatement_t: portQuick.abatement_tco2e ?? null,
      share_pct: portQuick.abatement_pct ?? null,
      capex: portQuick.capex_inr ?? null,
      net_benefit: portQuick.net_annual_benefit_inr ?? null,
      payback_years: portQuick.blended_payback_yrs ?? null,
      npv: portQuick.npv_inr ?? null,
      curve: allCurve.filter((c: any) => quickWinIds.has(c.id)),
    },
  };

  // Compliance mapping
  const comp = r.compliance || {};
  const cb = comp.cbam || {};
  const br = comp.brsr || {};

  const compliance = {
    cbam: {
      applicability: cb.applicable ? "Applicable" : "Not applicable (facility sector outside direct CBAM coverage)",
      exposure_t: cb.embedded_emissions_exported_tco2e ?? null,
      indicative_cost: cb.indicative_annual_cost_inr ?? null,
      reference_price: cb.reference_price_inr_per_tco2e ?? null,
      export_share_pct: cb.eu_export_share_pct ?? null,
      included: ["Direct emissions (Scope 1)", "Indirect electricity emissions (Scope 2)"],
      excluded: ["Precursors and raw materials without installation-specific verification", "Freight outside EU customs territory"],
      assumptions: [cb.basis, cb.caveat].filter(Boolean),
    },
    brsr: (br.readiness || []).map((item: any) => ({
      name: item.item || "BRSR Indicator",
      status: (item.status === "ready" ? "Ready" : item.status === "partial" ? "Partial" : "External action required") as "Ready" | "Partial" | "Missing" | "External action required",
      detail: item.note || (item.value_tco2e ? `${item.value_tco2e.toLocaleString()} tCO₂e` : "Ready for audit package"),
    })),
  };

  // Methodology mapping
  const meth = r.methodology || {};
  const methodology = {
    standard: meth.standard || "GHG Protocol Corporate Standard (2004)",
    gwp: meth.gwp || "IPCC AR6 100-year GWP values",
    boundary: "Operational control: Scope 1 direct combustion, Scope 2 location-based grid electricity, Scope 3 selected purchased materials, freight, and waste disposal.",
    limitations: [meth.verification_status, meth.benchmark_note].filter(Boolean),
    assumptions: [meth.factor_note, meth.leak_rule].filter(Boolean),
  };

  return {
    id: r.id || `assessment-${r.versions?.engine || "live"}-${Date.now()}`,
    plant,
    origin,
    footprint: {
      total: {
        base: totalBase,
        low: totalRange.low ?? totalBase,
        high: totalRange.high ?? totalBase,
      },
      uncertainty_pct: uncertaintyPct,
      scopes,
      streams,
      gate_to_gate: gateToGate,
      cradle_to_gate: cradleToGate,
      biogenic_t: biogenic,
    },
    sankey: {
      nodes,
      links,
    },
    leaks: {
      peer_percentile: hl.peer_percentile ?? rawLeaks.peer_percentile ?? null,
      findings: leakFindings,
    },
    recommendations: {
      items: recItems,
      blocked: blockedItems,
      portfolios,
    },
    compliance,
    methodology,
  };
};
