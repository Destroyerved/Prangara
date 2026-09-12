import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import type { Stream } from "../types/domain";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  PageHeading,
  SectionHeading,
  Segmented,
  SearchBox,
  Note,
  Badge,
} from "../components/ui/common";
import { DataTable } from "../components/tables/DataTable";
import SankeyChart from "../components/charts/SankeyChart";
import { number } from "../lib/format";
export default function Footprint() {
  const w = useWorkspace(),
    a = w.assessment!,
    [params, setParams] = useSearchParams();
  const scope = params.get("scope") || "all";
  const [view, setView] = useState("flow"),
    [search, setSearch] = useState("");
  const { reference, setDrawer } = w;
  const columns = useMemo<ColumnDef<Stream>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Stream",
        cell: (i) => (
          <div className="record-name">
            {i.row.original.name}
            <small>{i.row.original.category}</small>
          </div>
        ),
      },
      {
        accessorKey: "scope",
        header: "Scope",
        cell: (i) => <Badge>Scope {i.row.original.scope}</Badge>,
      },
      {
        accessorKey: "quantity",
        header: "Activity",
        cell: (i) => (
          <>
            {number(i.row.original.quantity, 1)}
            <small className="cell-unit">{i.row.original.unit}</small>
          </>
        ),
      },
      {
        id: "factor",
        header: "Factor",
        cell: (i) => {
          const f = reference.data?.find(
            (f) => f.key === i.row.original.factor_key,
          );
          return f ? (
            <button
              className="factor-link"
              onClick={() => setDrawer({ kind: "factor", data: f })}
            >
              {number(f.value, 3)}
              <small className="cell-unit">{f.unit}</small>
            </button>
          ) : (
            "Unavailable"
          );
        },
      },
      {
        id: "emissions",
        accessorFn: (s) => s.emissions.base,
        header: "Emissions",
        cell: (i) => (
          <>
            {number(i.row.original.emissions.base)}
            <small> tCO₂e</small>
          </>
        ),
      },
      {
        accessorKey: "share_pct",
        header: "Share",
        cell: (i) => number(i.row.original.share_pct, 1) + "%",
      },
      {
        id: "range",
        header: "Range · tCO₂e",
        cell: (i) =>
          number(i.row.original.emissions.low) +
          " – " +
          number(i.row.original.emissions.high),
      },
    ],
    [reference.data, setDrawer],
  );
  const streams = a.footprint.streams.filter(
    (s) =>
      (scope === "all" || s.scope === scope) &&
      s.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="ANALYZE / FOOTPRINT"
        title="Carbon footprint"
        description="Follow every tonne back to an activity stream."
        action={
          <button
            className="button"
            onClick={() =>
              setDrawer({
                kind: "calculation",
                title: "Inventory boundary",
                formula: "Scope 1 + Scope 2 + modelled Scope 3",
                rows: [
                  ["Standard", a.methodology.standard],
                  ["Boundary", a.methodology.boundary],
                ],
                note: a.methodology.limitations.slice(5, 8).join(" "),
              })
            }
          >
            How calculated?
          </button>
        }
      />
      <div className="footprint-headline">
        <strong>
          {number(a.footprint.total.base)}
          <span>tCO₂e / year</span>
        </strong>
        <p>
          {a.footprint.streams.length
            ? "Range " +
              number(a.footprint.total.low) +
              " – " +
              number(a.footprint.total.high) +
              " · ±" +
              number(a.footprint.uncertainty_pct, 1) +
              "%"
            : "Uncertainty range unavailable in this report snapshot"}
        </p>
      </div>
      <div className="scope-panels">
        {a.footprint.scopes.map((s) => (
          <button
            key={s.scope}
            className={scope === s.scope ? "selected" : ""}
            onClick={() => setParams({ scope: s.scope })}
          >
            <div className="eyebrow">
              <span className={"scope-dot s" + s.scope} />
              SCOPE {s.scope}
              <span>{number(s.share_pct, 1)}%</span>
            </div>
            <strong>
              {number(s.total)} <small>tCO₂e</small>
            </strong>
            <p>
              {s.scope === "1"
                ? "Direct fuel combustion"
                : s.scope === "2"
                  ? "Purchased electricity"
                  : "Materials, waste & freight"}
            </p>
          </button>
        ))}
      </div>
      <section className="section analytical-panel">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE CARBON FLOW</div>
            <h2>From source to scope</h2>
          </div>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "flow", label: "Flow" },
              { value: "table", label: "Table" },
            ]}
          />
        </div>
        {view === "flow" && (
          <SankeyChart
            onScope={(s) => {
              setParams({ scope: s });
              setView("table");
            }}
          />
        )}
        {view === "table" && (
          <p className="muted">
            Inspect the stream inventory below. Scope filters apply to the
            table.
          </p>
        )}
      </section>
      <section className="section">
        <SectionHeading
          title="Stream inventory"
          description="Select a stream to inspect its activity, factor and uncertainty."
        />
        <div className="filter-bar">
          <Segmented
            value={scope}
            onChange={(s) => setParams({ scope: s })}
            options={[
              { value: "all", label: "All scopes" },
              ...["1", "2", "3"].map((s) => ({
                value: s,
                label: "Scope " + s,
              })),
            ]}
          />
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search streams…"
          />
        </div>
        <DataTable
          data={streams}
          columns={columns}
          onRow={(s) => setDrawer({ kind: "stream", data: s })}
          caption="Annual carbon footprint by activity stream"
          initialSort={[{ id: "emissions", desc: true }]}
        />
      </section>
      <section className="section intensity-grid">
        <div>
          <div className="eyebrow">GATE-TO-GATE INTENSITY</div>
          <strong>
            {number(a.footprint.gate_to_gate, 2)} <small>tCO₂e / t</small>
          </strong>
          <p>
            Scope 1 + 2 per tonne of output. The compatible basis for
            operational peer benchmarks.
          </p>
        </div>
        <div>
          <div className="eyebrow">CRADLE-TO-GATE INTENSITY</div>
          <strong>
            {number(a.footprint.cradle_to_gate, 2)} <small>tCO₂e / t</small>
          </strong>
          <p>
            All modelled scopes per tonne of output. Material concentration is
            analysed separately.
          </p>
        </div>
      </section>
      <Note>
        Biogenic CO₂ memo:{" "}
        {a.footprint.biogenic_t == null
          ? "Unavailable"
          : number(a.footprint.biogenic_t) + " tCO₂e"}
        . Biogenic CO₂ is disclosed separately and excluded from the Scope 1
        total.
      </Note>
    </div>
  );
}
