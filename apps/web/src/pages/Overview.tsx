import { AnimatedValue } from "../components/ui/AnimatedValue";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Info } from "lucide-react";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  PageHeading,
  SectionHeading,
  Metrics,
  Segmented,
  Empty,
  Skeleton,
} from "../components/ui/common";
import { money, number, payback, portfolioLabels } from "../lib/format";
import { LeakCard } from "../components/leaks/LeakCard";
import { ActionTable } from "../components/actions/ActionTable";
import MaccChart from "../components/charts/MaccChart";
import type { PortfolioMode } from "../types/domain";
import { ReportExportButton } from "../components/reports/ReportExportButton";

export default function Overview() {
  const w = useWorkspace(),
    a = w.assessment,
    navigate = useNavigate();
  const [mode, setMode] = useState<PortfolioMode>("cash_positive_only");
  if (!a) return <Skeleton />;
  const cp = a.recommendations.portfolios.cash_positive_only,
    qw = a.recommendations.portfolios.quick_wins,
    all = a.recommendations.portfolios.all;
  const detailed = a.footprint.streams.length > 0;
  const totalDetails = () =>
    w.setDrawer({
      kind: "calculation",
      title: "Annual carbon footprint",
      formula: "Total = Scope 1 + Scope 2 + modelled Scope 3",
      rows: a.footprint.scopes.map((s) => [
        "Scope " + s.scope,
        number(s.total) + " tCO₂e",
      ]),
      note:
        a.origin.note +
        " Biogenic CO₂ is excluded from the total and disclosed separately.",
    });
  const headline = money(cp.net_benefit).split(" ");
  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="WORKSPACE / OVERVIEW"
        title="Assessment overview"
        description="A clearer footprint. A stronger business case."
        action={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ReportExportButton assessmentId={a.id} />
            <span className="meta">Annual snapshot · Screening grade</span>
          </div>
        }
      />
      <section className="executive-hero">
        <div className="financial-hero">
          <div className="eyebrow">
            <span className="positive-dot" />
            YOUR CASH-POSITIVE OPPORTUNITY
          </div>
          <div className="hero-number">
            {cp.net_benefit == null ? (
              headline[0]
            ) : (
              <AnimatedValue
                value={cp.net_benefit}
                kind="money"
                recordKey={a.id + "-benefit"}
              />
            )}
            <span>
              {headline[1]} <small>/ yr</small>
            </span>
          </div>
          <p className="hero-caption">Potential annual net benefit</p>
          <div className="hero-support">
            <div>
              <small>Indicative investment</small>
              <strong>{money(cp.capex)}</strong>
            </div>
            <div>
              <small>Blended payback</small>
              <strong>{payback(cp.payback_years)}</strong>
            </div>
            <div>
              <small>Interventions</small>
              <strong>
                {detailed ? cp.count : "Unavailable"}
                <span>{detailed ? " cash positive" : ""}</span>
              </strong>
            </div>
          </div>
          <LiquidButton
            variant="blue"
            size="md"
            text="Explore the cash-positive portfolio"
            to="/portfolio?view=cash_positive_only"
            className="portfolio-cta"
          />
        </div>
        <div className="carbon-hero">
          <button className="eyebrow full-width" onClick={totalDetails}>
            ANNUAL CARBON FOOTPRINT
            <ArrowUpRight size={16} />
          </button>
          <button
            className="carbon-number"
            onClick={totalDetails}
            aria-label="How is the annual footprint calculated?"
          >
            <AnimatedValue
              value={a.footprint.total.base}
              recordKey={a.id + "-footprint"}
            />
          </button>
          <p>tCO₂e / year</p>
          <div className="uncertainty">
            <span>
              {detailed
                ? number(a.footprint.total.low) +
                  " – " +
                  number(a.footprint.total.high) +
                  " tCO₂e"
                : "Uncertainty range not supplied"}
            </span>
            {detailed && <b>±{number(a.footprint.uncertainty_pct, 1)}%</b>}
          </div>
          <div className="scope-band">
            {a.footprint.scopes.map((s) => (
              <button
                key={s.scope}
                aria-label={"Inspect Scope " + s.scope}
                onClick={() => navigate("/footprint?scope=" + s.scope)}
                style={{
                  width: s.share_pct + "%",
                  background: "var(--scope-" + s.scope + ")",
                }}
              />
            ))}
          </div>
          <div className="scope-legend">
            {a.footprint.scopes.map((s) => (
              <button
                key={s.scope}
                onClick={() => navigate("/footprint?scope=" + s.scope)}
              >
                <span className={"scope-dot s" + s.scope} />
                <small>Scope {s.scope}</small>
                <strong>{number(s.share_pct)}%</strong>
              </button>
            ))}
          </div>
          <Link
            to="/portfolio?view=cash_positive_only"
            className="reduction-callout"
          >
            <strong>{number(cp.share_pct, 1)}%</strong>
            <span>
              of your footprint could be removed
              <br />
              at no net cost.
            </span>
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
      <Metrics
        items={[
          {
            label: "Cash-positive abatement",
            value: number(cp.abatement_t),
            unit: cp.abatement_t == null ? "" : "tCO₂e",
            onClick: () => navigate("/portfolio?view=cash_positive_only"),
          },
          {
            label: "Total available abatement",
            value: detailed ? number(all.abatement_t) : "Unavailable",
            unit: detailed ? "tCO₂e" : "",
          },
          {
            label: "Quick wins to start with",
            value: detailed ? number(qw.count) : "Unavailable",
            unit: detailed ? "actions" : "",
          },
          {
            label: "Quick-win annual benefit",
            value: money(qw.net_benefit),
            unit: qw.net_benefit == null ? "" : "/ yr",
            positive: true,
          },
        ]}
      />
      <section className="section">
        <SectionHeading
          index="01 / DIAGNOSE"
          title="Where carbon is leaking"
          description="Sector performance gaps and concentrated carbon streams."
          to="/leaks"
          label="View all leak points"
        />
        {a.leaks.findings.length ? (
          <div className="leak-grid">
            {a.leaks.findings.slice(0, 3).map((l, i) => (
              <LeakCard key={l.id} leak={l} index={i} />
            ))}
          </div>
        ) : (
          <Empty
            title="Detailed leak findings unavailable"
            description="Detailed telemetry is currently configured for Tirupur Knitwear Dyeing Unit."
            action={
              <button
                className="button"
                onClick={() => w.selectPlant("textile_dyeing")}
              >
                Switch to Tirupur Unit
              </button>
            }
          />
        )}
      </section>
      {detailed && (
        <>
          <section className="section">
            <SectionHeading
              index="02 / ACT"
              title="Best moves right now"
              description="Low complexity. Short payback. A practical place to begin."
              to="/actions?view=quick_wins"
              label="Explore quick wins"
            />
            <ActionTable
              compact
              items={a.recommendations.items
                .filter((x) => x.quick_win)
                .sort((a, b) => b.net_benefit - a.net_benefit)
                .slice(0, 5)}
            />
            <div className="quick-footer">
              <span>{money(qw.capex)} quick-win investment</span>
              <span>{payback(qw.payback_years)} blended payback</span>
              <Link to="/actions">View all circular actions →</Link>
            </div>
          </section>
          <section className="section analytical-panel">
            <SectionHeading
              index="03 / INVEST"
              title="The cost of cutting carbon"
              description="A negative cost per tonne identifies a cash-positive option."
              to="/portfolio"
              label="Open portfolio"
            />
            <div className="chart-toolbar">
              <span>Marginal Abatement Cost Curve</span>
              <Segmented
                value={mode}
                onChange={setMode}
                options={(Object.keys(portfolioLabels) as PortfolioMode[]).map(
                  (v) => ({ value: v, label: portfolioLabels[v] }),
                )}
              />
            </div>
            <MaccChart mode={mode} compact />
          </section>
        </>
      )}
      <section className="section">
        <SectionHeading
          index="04 / PREPARE"
          title="Confidence for the next conversation"
          description="Know what is ready, what is missing, and what needs external review."
          to="/compliance"
          label="View compliance"
        />
        <div className="compliance-preview">
          <Link to="/compliance">
            <div className="eyebrow">CBAM / INDICATIVE</div>
            <h3>
              {a.compliance.cbam.indicative_cost == null
                ? "Exposure unavailable"
                : money(a.compliance.cbam.indicative_cost)}
            </h3>
            <p>Confirm goods coverage and reference price before acting.</p>
            <ArrowUpRight size={18} />
          </Link>
          <Link to="/compliance">
            <div className="eyebrow">BRSR / WORKING PAPERS</div>
            <h3>Readiness, with evidence gaps</h3>
            <p>
              Scope coverage and sources remain visible. External assurance is
              required.
            </p>
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <div className="trust-bar">
        <Info size={17} />
        <span>
          Source references available · Evidence status in Methodology ·
          Screening-grade accounting
        </span>
        <Link to="/methodology">Methodology & compliance ↗</Link>
      </div>
    </div>
  );
}
