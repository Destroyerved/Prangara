import { describe, it, expect } from "vitest";
import { assessmentSchema, plantSchema, factorSchema } from "./domain";
import snapshots from "../data/assessments.json";
import reference from "../data/reference.json";
describe("fixture and rendering integrity", () => {
  it("validates all ten snapshots against the proposed contract", () => {
    expect(Object.keys(snapshots)).toHaveLength(10);
    Object.values(snapshots).forEach((a) =>
      expect(assessmentSchema.safeParse(a).success).toBe(true),
    );
  });
  it("keeps report-only unknowns null rather than manufacturing zeroes", () => {
    for (const [key, a] of Object.entries(snapshots)) {
      if (key === "textile_dyeing") continue;
      expect(a.footprint.total.low).toBeNull();
      expect(a.footprint.uncertainty_pct).toBeNull();
      expect(a.recommendations.portfolios.all.capex).toBeNull();
      expect(a.recommendations.portfolios.quick_wins.count).toBeNull();
    }
  });
  it("preserves textile mass balance across streams and Sankey flows", () => {
    const a = assessmentSchema.parse(snapshots.textile_dyeing);
    expect(
      a.footprint.streams.reduce((sum, s) => sum + s.emissions.base, 0),
    ).toBe(24069);
    for (const s of a.footprint.scopes) {
      expect(
        a.footprint.streams
          .filter((x) => x.scope === s.scope)
          .reduce((sum, x) => sum + x.emissions.base, 0),
      ).toBe(s.total);
    }
    expect(
      a.sankey.links
        .filter((l) => l.target === "total")
        .reduce((sum, l) => sum + l.value, 0),
    ).toBe(24069);
  });
  it("keeps portfolio widths and selected IDs consistent with returned totals", () => {
    const a = assessmentSchema.parse(snapshots.textile_dyeing);
    for (const p of Object.values(a.recommendations.portfolios)) {
      expect(p.curve.reduce((sum, v) => sum + v.abatement_t, 0)).toBe(
        p.abatement_t,
      );
      expect(p.ids.length).toBe(p.count);
      expect(new Set(p.ids).size).toBe(p.ids.length);
      for (const point of p.curve) expect(p.ids).toContain(point.id);
    }
    expect(a.recommendations.portfolios.cash_positive_only.capex).toBe(
      45600000,
    );
    expect(a.recommendations.portfolios.cash_positive_only.net_benefit).toBe(
      46600000,
    );
  });
  it("does not exceed target streams with the illustrative de-rated portfolio", () => {
    const a = assessmentSchema.parse(snapshots.textile_dyeing);
    for (const action of a.recommendations.items)
      expect(action.abatement_t).toBeLessThanOrEqual(action.standalone_t);
    for (const stream of a.footprint.streams) {
      const sum = a.recommendations.items
        .filter((x) => x.target === stream.id)
        .reduce((total, x) => total + x.abatement_t, 0);
      expect(sum).toBeLessThanOrEqual(stream.emissions.base);
    }
  });
  it("retains negative factors and missing provenance instead of coercing them", () => {
    const factors = reference.map((f) => factorSchema.parse(f));
    expect(factors.find((f) => f.key === "digestion")?.value).toBe(-0.12);
    expect(factors.find((f) => f.key === "cotton_yarn")?.low).toBeNull();
  });
  it("rejects impossible inputs and percentage unit mistakes", () => {
    const plant = snapshots.textile_dyeing.plant;
    for (const patch of [
      { annual_output_t: 0 },
      { employees: 2.5 },
      { discount_rate: 12 },
      { eu_export_share_pct: 101 },
      { electricity_kwh: -1 },
      { tariff: Infinity },
    ])
      expect(plantSchema.safeParse({ ...plant, ...patch }).success).toBe(false);
  });
});
