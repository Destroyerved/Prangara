import { useState } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  PageHeading,
  Segmented,
  SearchBox,
  Empty,
  Skeleton,
} from "../components/ui/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeakCard } from "../components/leaks/LeakCard";
import { BenchmarkStrip } from "../components/charts/BenchmarkStrip";
import MachineTwin3D from "../components/twin/MachineTwin3D";
import { number } from "../lib/format";
import { Info, AlertTriangle, TrendingDown, Target, Box } from "lucide-react";

export default function LeakPoints() {
  const w = useWorkspace(),
    a = w.assessment;
  const [severity, setSeverity] = useState("all"),
    [rule, setRule] = useState("all"),
    [search, setSearch] = useState(""),
    [show3DTwin, setShow3DTwin] = useState(true);

  if (!a) return <Skeleton />;

  const criticalCount = a.leaks.findings.filter(
    (l) => l.severity === "critical" || l.severity === "high",
  ).length;
  const totalRecoverable = a.leaks.findings.reduce(
    (sum, l) => sum + (l.recoverable_t || 0),
    0,
  );
  const maxShare = Math.max(
    ...a.leaks.findings.map((l) => l.share_pct || 0),
    0,
  );

  const findings = a.leaks.findings.filter(
    (l) =>
      (severity === "all" || l.severity === severity) &&
      (rule === "all" || l.rule === rule) &&
      l.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="ANALYZE / LEAK INTELLIGENCE"
        title="Where performance escapes"
        description="Detect operational gaps and structural carbon concentrations."
        action={
          <button
            className={`button ${show3DTwin ? "primary" : ""}`}
            onClick={() => setShow3DTwin(!show3DTwin)}
          >
            <Box size={15} />
            <span>{show3DTwin ? "Hide 3D Plant Twin" : "Open 3D Plant Twin"}</span>
          </button>
        }
      />

      {/* Structured Executive Intelligence Grid */}
      <div className="leak-kpi-grid">
        <div className="leak-kpi-card">
          <div className="leak-kpi-label">Active Leak Points</div>
          <div className="leak-kpi-value">
            <span>{a.leaks.findings.length}</span>
            <small className="text-xs text-slate-400 font-normal">streams</small>
          </div>
          <div className="leak-kpi-sub">
            <AlertTriangle size={13} className="text-amber-400 shrink-0" />
            <span>{criticalCount} critical & high priority</span>
          </div>
        </div>

        <div className="leak-kpi-card">
          <div className="leak-kpi-label">Recoverable Volume</div>
          <div className="leak-kpi-value text-emerald-400">
            <span>{number(totalRecoverable)}</span>
            <small className="text-xs text-slate-400 font-normal">tCO₂e / yr</small>
          </div>
          <div className="leak-kpi-sub">
            <TrendingDown size={13} className="text-emerald-400 shrink-0" />
            <span>Operational recovery potential</span>
          </div>
        </div>

        <div className="leak-kpi-card">
          <div className="leak-kpi-label">Peak Concentration</div>
          <div className="leak-kpi-value text-cyan-400">
            <span>{number(maxShare, 1)}%</span>
            <small className="text-xs text-slate-400 font-normal">share</small>
          </div>
          <div className="leak-kpi-sub">
            <Target size={13} className="text-cyan-400 shrink-0" />
            <span>Largest single process hotspot</span>
          </div>
        </div>

        <div className="leak-kpi-card">
          <div className="leak-kpi-label">Sector Peer Baseline</div>
          <div className="leak-kpi-value">
            {a.leaks.peer_percentile != null ? (
              <span>p{number(a.leaks.peer_percentile)}</span>
            ) : (
              <span className="text-xs font-bold tracking-wider uppercase text-sky-800 dark:text-cyan-300 bg-sky-100 dark:bg-cyan-950/70 border border-sky-300 dark:border-cyan-800/60 px-2.5 py-1 rounded-full">
                Stream Screening
              </span>
            )}
          </div>
          <div className="leak-kpi-sub">
            {a.leaks.peer_percentile != null ? (
              <span>Gate-to-gate intensity</span>
            ) : (
              <span>Process literature calibrated</span>
            )}
          </div>
          {a.leaks.peer_percentile != null && (
            <div className="mt-2">
              <BenchmarkStrip percentile={a.leaks.peer_percentile} />
            </div>
          )}
        </div>
      </div>

      {/* Interactive 3D Machine Leak-Point Digital Twin */}
      {show3DTwin && (
        <MachineTwin3D />
      )}

      <div className="leak-notice-banner">
        <Info size={16} />
        <span>
          A carbon leak is an excess or concentrated emission stream identified by peer benchmark comparison or structural concentration, calibrated for {w.sector.data?.name || "your sector"}.
        </span>
      </div>

      <div className="filter-bar">
        <Segmented
          value={severity}
          onChange={setSeverity}
          options={["all", "critical", "high", "moderate", "watch"].map(
            (v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }),
          )}
        />
        <Select value={rule} onValueChange={setRule}>
          <SelectTrigger className="w-[210px] h-[38px] rounded-full" aria-label="Detection rule">
            <SelectValue placeholder="All detection rules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All detection rules</SelectItem>
            <SelectItem value="benchmark_breach">Benchmark breach</SelectItem>
            <SelectItem value="material_concentration">Material concentration</SelectItem>
            <SelectItem value="structural_hotspot">Structural hotspot</SelectItem>
          </SelectContent>
        </Select>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search leak points…"
        />
        <span className="text-xs text-slate-400 font-medium ml-auto">
          {findings.length} {findings.length === 1 ? "finding" : "findings"}
        </span>
      </div>

      <div className="leak-grid expanded">
        {findings.map((l, i) => (
          <LeakCard key={l.id} leak={l} index={i} expanded />
        ))}
      </div>

      {!findings.length && (
        <Empty
          title={
            a.leaks.findings.length
              ? "No matching findings"
              : "No leak findings supplied"
          }
          description={
            a.leaks.findings.length
              ? "Try a different severity or rule."
              : "This report snapshot does not include evaluated leak findings. An empty list is not evidence of a clean inventory."
          }
        />
      )}

      <section className="section rule-grid">
        {[
          [
            "01",
            "Benchmark breach",
            "Intensity exceeds the sector p75. Severity reflects distance above the threshold and footprint share.",
          ],
          [
            "02",
            "Material concentration",
            "A stream exceeds 15% of the footprint and its intensity is above the sector median.",
          ],
          [
            "03",
            "Structural hotspot",
            "A stream exceeds 25% of the footprint with no applicable benchmark. Factory efficiency alone would miss it.",
          ],
        ].map(([n, t, d]) => (
          <div key={n} className="rule-card">
            <span className="eyebrow">RULE {n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
