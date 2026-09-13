import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowUpRight, ShieldBan, Store } from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  PageHeading,
  Segmented,
  SearchBox,
  SectionHeading,
  Badge,
  Empty,
  Note,
  Skeleton,
} from "../components/ui/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionTable } from "../components/actions/ActionTable";
import { money } from "../lib/format";
export default function CircularActions() {
  const w = useWorkspace(),
    a = w.assessment,
    [params, setParams] = useSearchParams();
  const view = params.get("view") || "all";
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all");

  if (!a) return <Skeleton />;

  const items = a.recommendations.items.filter(
    (x) =>
      (view === "all" ||
        (view === "quick_wins" && x.quick_win) ||
        (view === "cash_positive_only" && x.status === "cash_positive") ||
        (view === "net_cost" && x.status === "net_cost") ||
        (view === "capped" && x.cap_pct != null)) &&
      (category === "all" || x.category === category) &&
      (x.name + " " + x.target).toLowerCase().includes(search.toLowerCase()),
  );
  const cp = a.recommendations.portfolios.cash_positive_only;
  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="ACT / CIRCULAR ACTION ENGINE"
        title="Good for the numbers."
        description="Compare interventions that reduce cost, carbon, or both."
      />
      <div className="action-summary">
        <div>
          <span className="eyebrow">CASH-POSITIVE ANNUAL BENEFIT</span>
          <strong className="positive">{money(cp.net_benefit)}</strong>
        </div>
        <div>
          <span className="eyebrow">QUICK-WIN INVESTMENT</span>
          <strong>
            {money(a.recommendations.portfolios.quick_wins.capex)}
          </strong>
        </div>
        <div>
          <span className="eyebrow">CONSTRAINTS SURFACED</span>
          <strong>
            {a.recommendations.items.filter((x) => x.cap_pct != null).length +
              a.recommendations.blocked.length}
            <small> cap / refusal records</small>
          </strong>
        </div>
      </div>
      <div className="filter-bar">
        <Segmented
          value={view}
          onChange={(v) => setParams({ view: v })}
          options={[
            { value: "all", label: "All actions" },
            { value: "cash_positive_only", label: "Cash positive" },
            { value: "quick_wins", label: "Quick wins" },
            { value: "net_cost", label: "Net cost" },
            { value: "capped", label: "Capped" },
          ]}
        />
      </div>
      <div className="filter-bar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search interventions or targets…"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] h-[39px]" aria-label="Intervention category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {["energy", "material", "process", "waste", "logistics"].map((v) => (
              <SelectItem key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="filter-note">
          Select an intervention name to inspect
        </span>
        <Link
          to="/marketplace"
          className="text-button"
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "var(--text-body-sm)",
            fontWeight: "var(--weight-medium)",
            textDecoration: "none",
            color: "var(--accent, #79D7E6)",
          }}
          title="Open Marketplace & RFQs to find implementation providers"
        >
          <Store size={14} />
          <span>Marketplace &amp; RFQs</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>
      {view === "quick_wins" && a.metadata?.quick_win_membership_available === false && <Note>The engine supplies quick-win totals, but does not identify the individual members. No membership is inferred here.</Note>}
      <ActionTable items={items} />
      <Note>
        Abatement is interaction-de-rated; financial columns are returned
        intervention business cases. Portfolio economics are returned
        separately. Missing NPV, gross saving or OPEX detail is not estimated in
        the browser.
      </Note>
      <section className="section refusal-section">
        <SectionHeading
          index="CONSTRAINT INTELLIGENCE"
          title="PRANGARA said no."
          description="Technical fit matters as much as financial return."
        />
        {a.recommendations.blocked.length ? (
          <div className="constraint-list">
            {a.recommendations.blocked.map((b) => (
              <button
                key={b.id}
                className="constraint-row"
                onClick={() => w.setDrawer({ kind: "calculation", title:b.name, formula:"Technical constraint", rows:[["Restriction",b.restriction||"Not supplied"]], note:"A blocked intervention has no fabricated economic estimate." })}
              >
                <ShieldBan size={22} />
                <div>
                  <h3>{b.name}</h3>
                  <p>{b.restriction}</p>
                </div>
                <Badge tone={b.cap_pct ? "moderate" : "critical"}>
                  {b.cap_pct ? "Cap reference · " + b.cap_pct + "%" : "Blocked"}
                </Badge>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title="No evaluated interventions were rejected for this plant"
            description="Try the pharma or ceramics report profile to inspect the documented refusal examples."
          />
        )}
        {a.recommendations.items
          .filter((x) => x.cap_pct != null)
          .map((b) => (
            <button
              className="constraint-row"
              key={b.id}
              onClick={() => w.setDrawer({ kind: "calculation", title:b.name, formula:"Technical constraint", rows:[["Restriction",b.restriction||"Not supplied"]], note:"A blocked intervention has no fabricated economic estimate." })}
            >
              <ShieldBan size={22} />
              <div>
                <h3>{b.name}</h3>
                <p>{b.restriction}</p>
              </div>
              <Badge tone="moderate">Capped at {b.cap_pct}%</Badge>
              <ArrowUpRight size={17} />
            </button>
          ))}
      </section>
    </div>
  );
}
