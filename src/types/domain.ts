import { z } from "zod";
const num = z.number().finite();
const maybe = num.nullable();
export const bandSchema = z.object({ base: num, low: num, high: num });
export const plantSchema = z.object({
  name: z.string().trim().min(2, "Enter a plant name."),
  sector: z.string().min(1),
  state: z.string().min(1),
  annual_output_t: num.positive("Output must be greater than zero."),
  annual_revenue_cr: num.nonnegative(),
  employees: num.int().nonnegative(),
  electricity_kwh: num.nonnegative(),
  fuels: z.record(z.string(), num.nonnegative()),
  materials: z.record(z.string(), num.nonnegative()),
  waste: z.record(z.string(), num.nonnegative()),
  freight: z.record(z.string(), num.nonnegative()),
  tariff: num.nonnegative(),
  discount_rate: num.min(0).max(1),
  eu_export_share_pct: num.min(0).max(100),
});
export const streamSchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: z.enum(["1", "2", "3"]),
  category: z.string(),
  quantity: maybe,
  unit: z.string(),
  factor_key: z.string().nullable(),
  factor_keys: z.array(z.string()).optional(),
  detail: z.record(z.string(),z.unknown()).optional(),
  emissions: bandSchema,
  share_pct: num,
  working: z.string(),
});
export const leakSchema = z.object({
  id: z.string(),
  stream_id: z.string(),
  name: z.string(),
  rule: z.enum([
    "benchmark_breach",
    "material_concentration",
    "structural_hotspot",
  ]),
  severity: z.enum(["critical", "high", "moderate", "watch"]),
  share_pct: num,
  actual: maybe,
  unit: z.string(),
  p25: maybe,
  p50: maybe,
  p75: maybe,
  percentile: maybe,
  recoverable_t: maybe,
  reason: z.string(),
});
export const actionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  target: z.string(),
  status: z.enum(["cash_positive", "net_cost", "blocked", "constraint_only"]),
  quick_win: z.boolean(),
  cap_pct: maybe,
  restriction: z.string().nullable(),
  capex: num,
  net_benefit: num,
  gross_saving: maybe,
  opex_delta: maybe,
  payback_years: maybe,
  npv: maybe,
  lcoa: num,
  standalone_t: num,
  abatement_t: num,
  abatement_range: bandSchema,
  difficulty: num,
  disruption_days: maybe,
  confidence: z.enum(["high", "medium", "low"]),
  savings_model: z.string(),
  lifetime_years: maybe,
  physical_statement: z.string(),
  evidence: z.string(),
  caveats: z.array(z.string()),
});
const portfolioSchema = z.object({
  ids: z.array(z.string()),
  count: maybe,
  abatement_t: maybe,
  share_pct: maybe,
  capex: maybe,
  net_benefit: maybe,
  payback_years: maybe,
  npv: maybe,
  curve: z.array(z.object({ id: z.string(), abatement_t: num, lcoa: num })),
});
export const factorSchema = z.object({
  key: z.string(),
  name: z.string(),
  group: z.string(),
  scope: z.enum(["1", "2", "3"]),
  value: maybe,
  low: maybe,
  high: maybe,
  unit: z.string(),
  source: z.string(),
  vintage: z.string().nullable(),
  state: z.string().nullable(),
});
export const sectorSchema = z.object({
  key: z.string(),
  name: z.string(),
  cluster: z.string(),
  state: z.string(),
  demo_profile: z.object({name:z.string()}).passthrough(),
  benchmarks: z.array(
    z.object({
      name: z.string(),
      unit: z.string(),
      p25: maybe,
      p50: maybe,
      p75: maybe,
    }),
  ),
  regulatory_flags: z.array(z.string()),
});
export const assessmentSchema = z.object({
  metadata: z.record(z.string(),z.unknown()).optional(),
  id: z.string(),
  plant: plantSchema,
  origin: z.object({
    kind: z.enum(["development_fixture", "engine"]),
    note: z.string(),
    reference: z.string(),
  }),
  footprint: z.object({
    total: z.object({ base: num, low: maybe, high: maybe }),
    uncertainty_pct: maybe,
    scopes: z.array(
      z.object({ scope: z.enum(["1", "2", "3"]), total: num, share_pct: num }),
    ),
    streams: z.array(streamSchema),
    gate_to_gate: maybe,
    cradle_to_gate: maybe,
    biogenic_t: maybe,
  }),
  sankey: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        scope: z.enum(["1", "2", "3", "total"]),
        stream_id: z.string().nullable(),
      }),
    ),
    links: z.array(
      z.object({
        source: z.string(),
        target: z.string(),
        value: num,
        scope: z.enum(["1", "2", "3"]),
      }),
    ),
  }),
  leaks: z.object({ peer_percentile: maybe, findings: z.array(leakSchema) }),
  recommendations: z.object({
    items: z.array(actionSchema),
    blocked: z.array(z.object({id:z.string(),name:z.string(),restriction:z.string().nullable(),cap_pct:maybe})),
    portfolios: z.object({
      all: portfolioSchema,
      cash_positive_only: portfolioSchema,
      quick_wins: portfolioSchema,
    }),
  }),
  compliance: z.object({
    cbam: z.object({
      applicability: z.string(),
      exposure_t: maybe,
      indicative_cost: maybe,
      reference_price: maybe,
      export_share_pct: maybe,
      included: z.array(z.string()),
      excluded: z.array(z.string()),
      assumptions: z.array(z.string()),
    }),
    brsr: z.array(
      z.object({
        name: z.string(),
        status: z.enum([
          "Ready",
          "Partial",
          "Missing",
          "External action required",
        ]),
        detail: z.string(),
      }),
    ),
  }),
  methodology: z.object({
    standard: z.string(),
    gwp: z.string(),
    boundary: z.string(),
    limitations: z.array(z.string()),
    assumptions: z.array(z.string()),
  }),
});
export type PlantProfile = z.infer<typeof plantSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Stream = z.infer<typeof streamSchema>;
export type Leak = z.infer<typeof leakSchema>;
export type Factor = z.infer<typeof factorSchema>;
export type Sector = z.infer<typeof sectorSchema>;
export type PortfolioMode = "all" | "cash_positive_only" | "quick_wins";
export type Band = z.infer<typeof bandSchema>;
export type DrawerRecord =
  | { kind: "action"; data: Action }
  | { kind: "stream"; data: Stream }
  | { kind: "leak"; data: Leak }
  | { kind: "factor"; data: Factor }
  | {
      kind: "calculation";
      title: string;
      formula: string;
      rows: [string, string][];
      note: string;
    };
