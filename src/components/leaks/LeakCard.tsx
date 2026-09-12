import { ArrowUpRight } from "lucide-react";
import type { Leak } from "../../types/domain";
import { useWorkspace } from "../../hooks/useWorkspace";
import { Badge } from "../ui/common";
import { BenchmarkStrip } from "../charts/BenchmarkStrip";
import { label, number } from "../../lib/format";
export function LeakCard({
  leak,
  index,
  expanded = false,
}: {
  leak: Leak;
  index: number;
  expanded?: boolean;
}) {
  const w = useWorkspace();
  return (
    <button
      className="leak-card"
      onClick={() => w.setDrawer({ kind: "leak", data: leak })}
    >
      <div className="leak-card-top">
        <span className="meta">{String(index + 1).padStart(2, "0")}</span>
        <Badge tone={leak.severity}>{label(leak.severity)}</Badge>
      </div>
      <h3>
        {leak.name}
        <ArrowUpRight size={16} />
      </h3>
      <div className="leak-value">
        {leak.rule === "structural_hotspot"
          ? number(leak.share_pct, 1) + "%"
          : leak.percentile == null
            ? "Unavailable"
            : "p" + number(leak.percentile)}
        <small>
          {leak.rule === "structural_hotspot"
            ? "of total footprint"
            : "your sector position"}
        </small>
      </div>
      <BenchmarkStrip
        percentile={leak.percentile}
        share={leak.share_pct}
        structural={leak.rule === "structural_hotspot"}
      />
      {expanded && (
        <>
          <p className="leak-reason">{leak.reason}</p>
          <div className="leak-detail-grid">
            <div>
              <small>Plant intensity</small>
              <b>
                {number(leak.actual)} <span>{leak.unit}</span>
              </b>
            </div>
            <div>
              <small>Sector p25 / median / p75</small>
              <b>
                {number(leak.p25)} / {number(leak.p50)} / {number(leak.p75)}
              </b>
            </div>
            <div>
              <small>Recovery to median</small>
              <b>
                {leak.recoverable_t == null
                  ? "Not benchmarked"
                  : number(leak.recoverable_t) + " tCO₂e"}
              </b>
            </div>
            <div>
              <small>Footprint share</small>
              <b>{number(leak.share_pct, 1)}%</b>
            </div>
          </div>
        </>
      )}
      <div className="leak-footer">
        {label(leak.rule)}
        <span>Inspect finding →</span>
      </div>
    </button>
  );
}
