import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MaccTable } from "./MaccTable";
import { assessmentSchema } from "../../types/domain";
import snapshots from "../../data/assessments.json";
const a = assessmentSchema.parse(snapshots.textile_dyeing);
describe("accessible MACC equivalent", () => {
  it("renders selected-curve widths and true signed costs, not action-wide economics", () => {
    const first = a.recommendations.items[0];
    const html = renderToStaticMarkup(
      <MaccTable
        mode="quick_wins"
        curve={[{ id: first.id, abatement_t: 17.234, lcoa: -9876.5 }]}
        actions={[{ ...first, abatement_t: 99999, lcoa: 88888 }]}
        onOpen={() => {}}
      />,
    );
    expect(html).toContain("<table>");
    expect(html).toContain("Quick wins — MACC data");
    expect(html).toContain("17.234");
    expect(html).toContain("-9,876.5");
    expect(html).not.toContain("99,999");
    expect(html).not.toContain("88,888");
    expect(html).toContain(first.name);
  });
  it("reports an absent curve instead of inferring widths from actions", () => {
    const html = renderToStaticMarkup(
      <MaccTable
        mode="all"
        curve={[]}
        actions={a.recommendations.items}
        onOpen={() => {}}
      />,
    );
    expect(html).toContain("MACC data unavailable");
    expect(html).not.toContain("<table>");
  });
});
