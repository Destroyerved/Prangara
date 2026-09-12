import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Factor } from "../types/domain";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  PageHeading,
  Segmented,
  SearchBox,
  SectionHeading,
  Note,
  DetailRows,
  Skeleton,
} from "../components/ui/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "../components/tables/DataTable";
import { EvidenceStatus } from "../components/ui/EvidenceStatus";
import { number } from "../lib/format";
export default function Methodology() {
  const w = useWorkspace(),
    a = w.assessment,
    [params, setParams] = useSearchParams();

  if (!a) return <Skeleton />;
  const view = params.get("view") || "methodology";
  const [search, setSearch] = useState(""),
    [group, setGroup] = useState("all"),
    [stateOnly, setStateOnly] = useState(false);
  const columns = useMemo<ColumnDef<Factor>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Factor",
        cell: (i) => (
          <div className="record-name">
            {i.row.original.name}
            <small>
              {i.row.original.group}
              {i.row.original.state ? " · " + i.row.original.state : ""}
            </small>
          </div>
        ),
      },
      {
        accessorKey: "value",
        header: "Value",
        cell: (i) => number(i.row.original.value, 3),
      },
      {
        accessorKey: "low",
        header: "Low",
        cell: (i) => number(i.row.original.low, 3),
      },
      {
        accessorKey: "high",
        header: "High",
        cell: (i) => number(i.row.original.high, 3),
      },
      { accessorKey: "unit", header: "Unit" },
      { accessorKey: "scope", header: "Scope" },
      {
        accessorKey: "source",
        header: "Source",
        cell: (i) => (
          <span className="source-cell">{i.row.original.source}</span>
        ),
      },
      {
        accessorKey: "vintage",
        header: "Vintage",
        cell: (i) => i.row.original.vintage || "Not supplied",
      },
    ],
    [],
  );
  const factors = (w.reference.data || []).filter(
    (f) =>
      (group === "all" || f.group === group) &&
      (!stateOnly || !!f.state) &&
      (f.key + " " + f.name + " " + f.source + " " + (f.state || ""))
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="REPORT / METHODOLOGY & TRUST"
        title="Every number has a source."
        description="Understand the boundary, follow the calculation, and see what remains uncertain."
      />
      <div className="method-tabs">
        <Segmented
          value={view}
          onChange={(v) => setParams({ view: v })}
          options={[
            "methodology",
            "factors",
            "benchmarks",
            "uncertainty",
            "assumptions",
            "limitations",
            "evidence",
          ].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))}
        />
      </div>
      {view === "methodology" && (
        <>
          <div className="method-hero">
            <div>
              <div className="eyebrow">DETERMINISTIC BY DESIGN</div>
              <h2>
                Results you can follow.
                <br />
                Assumptions you can challenge.
              </h2>
              <p>
                The engine calculates. The interface presents its inputs,
                factors, results and limitations without hiding missing
                evidence.
              </p>
            </div>
            <div className="method-chain">
              {["Activity", "Factor", "Footprint", "Decision"].map((s, i) => (
                <div key={s}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <strong>{s}</strong>
                  {i < 3 && <ArrowRight size={16} />}
                </div>
              ))}
            </div>
          </div>
          <p className="muted">
            PRANGARA · Industrial Carbon Intelligence Network. Measure → Detect
            → Decide → Connect → Implement → Verify.
          </p>
          <DetailRows
            rows={[
              ["Accounting standard", a.methodology.standard],
              ["Global warming potential", a.methodology.gwp],
              ["Assessment boundary", a.methodology.boundary],
              ["Reporting basis", "One declared year · INR"],
              ["Scope 2 treatment", "Location-based · state grid factor"],
              ["Biogenic CO₂", "Separate memo line; excluded from Scope 1"],
            ]}
          />
          <section className="section">
            <SectionHeading title="Limitations we are not hiding" />
            <ol className="limitations-list">
              {a.methodology.limitations.map((s, i) => (
                <li key={s}>
                  <span>L{String(i + 1).padStart(2, "0")}</span>
                  <p>{s}</p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
      {view === "evidence" && (
        <section className="section">
          <SectionHeading
            title="Evidence & data quality"
            description="Inspect the provenance available with this assessment."
          />
          <EvidenceStatus />
          <DetailRows
            rows={[
              ["Assessment ID", a.id],
              ["Source reference", a.origin.reference],
            ]}
          />
          <Note>{a.origin.note}</Note>
        </section>
      )}
      {view === "factors" && (
        <>
          <div className="filter-bar">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search factor IDs, sources or states…"
            />
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger className="w-[180px] h-[39px]" aria-label="Factor category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {["Electricity", "Fuel", "Material", "Waste", "Freight"].map(
                  (g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={stateOnly}
                onChange={(e) => setStateOnly(e.target.checked)}
              />
              State grids only
            </label>
          </div>
          {w.reference.isError ? (
            <Note>
              Reference data could not be loaded.{" "}
              <button onClick={() => w.reference.refetch()}>Retry</button>
            </Note>
          ) : (
            <DataTable
              data={factors}
              columns={columns}
              caption="Emission factor provenance"
              onRow={(f) => w.setDrawer({ kind: "factor", data: f })}
            />
          )}
          <Note>
            Unknown source editions, vintages and uncertainty bands are shown as
            unavailable. Factor values are screening references, not
            verification of a current official publication.
          </Note>
        </>
      )}
      {view === "benchmarks" && (
        <>
          <SectionHeading
            title={w.sector.data?.name || "Sector benchmarks"}
            description="Compare equivalent production and inventory boundaries."
          />
          <div className="benchmark-table">
            <div className="benchmark-row header">
              <span>Intensity metric</span>
              <span>p25</span>
              <span>p50</span>
              <span>p75</span>
            </div>
            {w.sector.data?.benchmarks.map((b) => (
              <div className="benchmark-row" key={b.name}>
                <strong>
                  {b.name}
                  <small>{b.unit}</small>
                </strong>
                <span>{number(b.p25)}</span>
                <span>{number(b.p50)}</span>
                <span>{number(b.p75)}</span>
              </div>
            ))}
          </div>
          <DetailRows
            rows={[
              ["Cohort / sample size", "Not supplied"],
              ["Period / quality grade", "Not supplied"],
              ["Benchmark source ID / version", "Not supplied"],
            ]}
          />
          <Note>
            {w.sector.data?.benchmarks.length
              ? "Screening percentiles from the project report. Only gate-to-gate carbon intensity should be compared with operational carbon benchmarks."
              : "Benchmark values for this report profile were not supplied."}
          </Note>
        </>
      )}
      {view === "uncertainty" && (
        <>
          <div className="uncertainty-hero">
            <div>
              <small>LOW</small>
              <strong>
                {a.footprint.streams.length
                  ? number(a.footprint.total.low)
                  : "Unavailable"}
              </strong>
            </div>
            <div>
              <small>BASE · tCO₂e</small>
              <strong>{number(a.footprint.total.base)}</strong>
            </div>
            <div>
              <small>HIGH</small>
              <strong>
                {a.footprint.streams.length
                  ? number(a.footprint.total.high)
                  : "Unavailable"}
              </strong>
            </div>
          </div>
          <div className="formula">
            Headline uncertainty = (high − low) / (2 × base)
          </div>
          <div className="rule-grid">
            <div>
              <h3>Addition</h3>
              <p>
                The engine adds low, base and high bounds separately. These are
                screening bands, not statistical confidence intervals.
              </p>
            </div>
            <div>
              <h3>Positive scaling</h3>
              <p>
                Activity quantity scales every part of the factor band.
                Electricity unit conversion belongs in the engine.
              </p>
            </div>
            <div>
              <h3>Negative scaling</h3>
              <p>
                The low and high endpoints must swap when a negative quantity is
                applied.
              </p>
            </div>
          </div>
        </>
      )}
      {view === "assumptions" && (
        <>
          <SectionHeading title="The assumption surface" />
          <ul className="assumption-list">
            {a.methodology.assumptions.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
          <div className="formula">CRF = r(1+r)ⁿ / ((1+r)ⁿ − 1)</div>
          <p className="muted">
            Capital recovery, savings models, substitution ceilings, NPV and
            interaction de-rating are backend responsibilities. The browser
            formats and visualises returned values.
          </p>
        </>
      )}
      {view === "limitations" && (
        <ol className="limitations-list">
          {a.methodology.limitations.map((s, i) => (
            <li key={s}>
              <span>L{String(i + 1).padStart(2, "0")}</span>
              <p>{s}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
