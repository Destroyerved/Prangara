import { useState } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  PageHeading,
  Segmented,
  SearchBox,
  Note,
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
import { number } from "../lib/format";


export default function LeakPoints() {
  const w = useWorkspace(),
    a = w.assessment;
  const [severity, setSeverity] = useState("all"),
    [rule, setRule] = useState("all"),
    [search, setSearch] = useState("");

  if (!a) return <Skeleton />;

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
      />
      <div className="peer-overview">
        <div>
          <div className="eyebrow">OVERALL SECTOR POSITION</div>
          <strong>
            {a.leaks.peer_percentile == null
              ? "Not supplied"
              : "p" + number(a.leaks.peer_percentile)}
          </strong>
          <p>Gate-to-gate intensity only · {w.sector.data?.name}</p>
        </div>
        <div>
          {a.leaks.peer_percentile != null ? (
            <BenchmarkStrip percentile={a.leaks.peer_percentile} />
          ) : (
            <p>
              Individual stream positions can be available even when an overall
              peer percentile is not supplied.
            </p>
          )}
        </div>
      </div>
      <Note>
        A carbon leak is an excess or concentrated emission stream, not a
        physical gas leak. Peer benchmarks are indicative screening percentiles
        from literature. Cohort identity, sample size, reporting period and
        data-quality scores are not supplied.
      </Note>
      <div className="filter-bar flex items-center gap-3 flex-wrap">
        <Segmented
          value={severity}
          onChange={setSeverity}
          options={["all", "critical", "high", "moderate", "watch"].map(
            (v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }),
          )}
        />
        <Select value={rule} onValueChange={setRule}>
          <SelectTrigger className="w-[210px] h-[39px]" aria-label="Detection rule">
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
          <div key={n}>
            <span className="eyebrow">RULE {n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
