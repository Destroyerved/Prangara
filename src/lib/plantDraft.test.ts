import { describe, it, expect } from "vitest";
import { parsePlantDraft } from "./plantDraft";
import { plantSchema } from "../types/domain";
import { payback } from "./format";
import snapshots from "../data/assessments.json";
const baseline = snapshots.textile_dyeing;
describe("local input drafts", () => {
  it("round-trips current exports without changing units or the baseline", () => {
    const draft = parsePlantDraft(JSON.stringify(baseline.plant));
    expect(draft).toEqual(baseline.plant);
    draft.name = "My revised plant";
    draft.fuels.coal = 1;
    expect(baseline.plant.fuels.coal).toBe(3900);
    expect(baseline.plant.name).not.toBe(draft.name);
  });
  it("allows unfinished drafts without bypassing assessment validation", () => {
    const draft = parsePlantDraft(
      JSON.stringify({ ...baseline.plant, name: "", annual_output_t: 0 }),
    );
    expect(draft.name).toBe("");
    expect(plantSchema.safeParse(draft).success).toBe(false);
  });
  it("rejects malformed, oversized, incompatible and assessment files", () => {
    for (const text of [
      "invalid",
      " ".repeat(1048577),
      JSON.stringify(baseline),
      JSON.stringify({ ...baseline.plant, evidence: [] }),
      JSON.stringify({ ...baseline.plant, discount_rate: 12 }),
      JSON.stringify({ ...baseline.plant, electricity_kwh: -1 }),
    ])
      expect(() => parsePlantDraft(text)).toThrow();
  });
  it("does not reinterpret unavailable payback as no financial return", () => {
    expect(payback(null)).toBe("Unavailable");
    expect(payback(1)).toBe("12 mo");
  });
});
