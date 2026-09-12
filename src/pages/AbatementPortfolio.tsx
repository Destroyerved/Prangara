import { useSearchParams } from "react-router-dom";
import { Download, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  PageHeading,
  Metrics,
  Segmented,
  SectionHeading,
  Note,
  Empty,
} from "../components/ui/common";
import { MaccTable } from "../components/tables/MaccTable";
import MaccChart from "../components/charts/MaccChart";
import {
  money,
  number,
  payback,
  portfolioLabels,
  downloadJson,
} from "../lib/format";
import type { PortfolioMode } from "../types/domain";
export default function AbatementPortfolio() {
  const w = useWorkspace(),
    a = w.assessment!,
    [params, setParams] = useSearchParams();
  const raw = params.get("view");
  const mode: PortfolioMode =
    raw === "cash_positive_only" || raw === "quick_wins" ? raw : "all";
  const p = a.recommendations.portfolios[mode],
    known = p.ids.length > 0;
  const residual = a.recommendations.items
    .filter((x) => x.target === "electricity" && p.ids.includes(x.id))
    .sort((a, b) => a.lcoa - b.lcoa);
  const maxStandalone = Math.max(1, ...residual.map((r) => r.standalone_t));
  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="ACT / ABATEMENT PORTFOLIO"
        title="Put capital where it counts."
        description="A costed view of the opportunities across your plant."
        action={
          <button
            className="button"
            onClick={() =>
              downloadJson(
                {
                  origin: a.origin,
                  plant: a.plant,
                  mode,
                  portfolio: p,
                  interventions: a.recommendations.items.filter((i) =>
                    p.ids.includes(i.id),
                  ),
                },
                "prangara-portfolio.json",
              )
            }
          >
            <Download size={15} />
            Export portfolio
          </button>
        }
      />
      <div className="portfolio-top">
        <Segmented
          value={mode}
          onChange={(v) => setParams({ view: v })}
          options={(Object.keys(portfolioLabels) as PortfolioMode[]).map(
            (v) => ({ value: v, label: portfolioLabels[v] }),
          )}
        />
        <span className="meta">
          The data source owns portfolio selection and de-rating.
        </span>
      </div>
      <Metrics
        items={[
          {
            label: "Annual net benefit",
            value: money(p.net_benefit),
            positive: true,
          },
          { label: "Investment required", value: money(p.capex) },
          {
            label: "Annual abatement",
            value:
              p.abatement_t != null
                ? number(p.abatement_t)
                : "Unavailable",
            unit: p.abatement_t == null ? "" : "tCO₂e",
          },
          {
            label: "Blended payback",
            value:
              p.payback_years == null
                ? "Unavailable"
                : payback(p.payback_years),
          },
        ]}
      />
      <div className="portfolio-submetrics">
        <span>
          {known
            ? p.count + " interventions"
            : "Intervention count unavailable"}
        </span>
        <span>
          {p.abatement_t != null
            ? number(p.share_pct, 1) + "% of footprint"
            : "Share unavailable"}
        </span>
        <span>NPV: {money(p.npv)}</span>
      </div>
      <section className="section analytical-panel">
        <SectionHeading
          title="Marginal Abatement Cost Curve"
          description="Width is tonnes removed. Height is the levelised cost of each tonne."
        />
        <MaccChart mode={mode} />
        <details>
          <summary className="text-button">View MACC data table</summary>
          <MaccTable
            curve={p.curve}
            actions={a.recommendations.items}
            mode={mode}
            onOpen={(data) => w.setDrawer({ kind: "action", data })}
          />
        </details>
        <Note>
          Below ₹0/tCO₂e, an intervention has a positive business case after
          annualised capital and operating costs. Bar widths use the selected
          portfolio’s returned abatement values.
        </Note>
      </section>
      <section className="section derating-section">
        <SectionHeading
          index="INTERACTION DE-RATING"
          title="Reductions don’t simply add up."
          description="Each intervention applies to what the previous one leaves behind."
        />
        {residual.length ? (
          <>
            <div className="derating-heading">
              <span>Purchased electricity</span>
              <span>Standalone → portfolio abatement</span>
            </div>
            {residual.map((r, i) => (
              <button
                className="residual-row"
                key={r.id}
                onClick={() => w.setDrawer({ kind: "action", data: r })}
              >
                <span className="residual-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="residual-name">{r.name}</span>
                <div className="residual-track">
                  <i
                    style={{
                      width: (r.standalone_t / maxStandalone) * 100 + "%",
                    }}
                  />
                  <b
                    style={{
                      width: (r.abatement_t / maxStandalone) * 100 + "%",
                    }}
                  />
                </div>
                <span>
                  {number(r.standalone_t)} <span className="muted">→</span>{" "}
                  <strong>{number(r.abatement_t)}</strong> <small>tCO₂e</small>
                </span>
                <ArrowUpRight size={14} />
              </button>
            ))}
            <div className="chart-caption">
              <span>
                Light track: standalone · Violet: interaction-de-rated
              </span>
              <span>Sorted by returned LCOA</span>
            </div>
          </>
        ) : (
          <Empty
            title="Interaction detail unavailable"
            description="This view requires intervention-level standalone and de-rated values."
          />
        )}
        <Note>
          For illustration: if a first measure removes 8% of a stream, 92%
          remains for the next measure. This explanation is not an additional
          calculation. Cross-stream overlap remains a disclosed engine
          limitation.
        </Note>
      </section>
    </div>
  );
}
