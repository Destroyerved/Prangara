import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../../hooks/useWorkspace";
import { Badge, DetailRows, Note } from "../ui/common";
import { money, number, payback, label } from "../../lib/format";
import type { Action, Factor, Leak, Stream } from "../../types/domain";
import { BenchmarkStrip } from "../charts/BenchmarkStrip";
import { EvidenceStatus } from "../ui/EvidenceStatus";
function ActionDetail({ a }: { a: Action }) {
  const w = useWorkspace(),
    refused = a.status === "blocked" || a.status === "constraint_only";
  return (
    <>
      <div className="drawer-chips">
        <Badge>{label(a.category)}</Badge>
        <Badge
          tone={
            refused
              ? "critical"
              : a.cap_pct
                ? "moderate"
                : a.status === "cash_positive"
                  ? "positive"
                  : "cost"
          }
        >
          {refused
            ? a.cap_pct
              ? "Cap reference"
              : "Blocked"
            : a.cap_pct
              ? "Capped at " + a.cap_pct + "%"
              : a.quick_win
                ? "Quick win"
                : label(a.status)}
        </Badge>
      </div>
      {a.restriction && (
        <div className="constraint-note">
          <strong>
            {refused ? "Technical constraint" : "Substitution ceiling"}
          </strong>
          <p>{a.restriction}</p>
        </div>
      )}
      {!refused && (
        <>
          <section className="drawer-section">
            <div className="eyebrow">THE BUSINESS CASE</div>
            <div
              className={
                "drawer-hero " + (a.net_benefit > 0 ? "positive" : "cost-text")
              }
            >
              {money(a.net_benefit)}
              <span>/ year</span>
            </div>
            <p>Potential annual net benefit</p>
            <DetailRows
              rows={[
                ["Indicative CAPEX", money(a.capex)],
                ["Simple payback", payback(a.payback_years)],
                ["Net present value", money(a.npv)],
                ["Gross annual savings", money(a.gross_saving)],
                ["Annual OPEX change", money(a.opex_delta)],
              ]}
            />
          </section>
          <section className="drawer-section">
            <h3>The carbon case</h3>
            <DetailRows
              rows={[
                [
                  "Standalone abatement",
                  number(a.standalone_t) + " tCO₂e / yr",
                ],
                [
                  "After interaction de-rating",
                  number(a.abatement_t) + " tCO₂e / yr",
                ],
                [
                  "Standalone range",
                  number(a.abatement_range.low) +
                    " – " +
                    number(a.abatement_range.high) +
                    " tCO₂e",
                ],
                ["Levelised cost of abatement", money(a.lcoa) + " / tCO₂e"],
              ]}
            />
            <div className="comparison-bars">
              <div>
                <span>Standalone</span>
                <i style={{ width: "100%" }} />
              </div>
              <div>
                <span>De-rated</span>
                <i
                  style={{
                    width:
                      (a.standalone_t > 0
                        ? (a.abatement_t / a.standalone_t) * 100
                        : 0) + "%",
                  }}
                />
              </div>
            </div>
            <p>
              De-rated abatement applies to the residual stream after preceding
              interventions. Portfolio totals come from the data source.
            </p>
          </section>
        </>
      )}
      <section className="drawer-section">
        <h3>Implementation</h3>
        <p>{a.physical_statement}</p>
        <DetailRows
          rows={[
            ["Target stream", label(a.target)],
            ["Difficulty", refused ? "Not evaluated" : a.difficulty + " / 5"],
            [
              "Production disruption",
              refused ? "Not evaluated" : number(a.disruption_days) + " days",
            ],
            [
              "Modelled lifetime",
              refused ? "Not evaluated" : number(a.lifetime_years) + " years",
            ],
          ]}
        />
        {w.assessment?.footprint.streams.find((s) => s.id === a.target) && (
          <button
            className="text-button"
            onClick={() => {
              const s = w.assessment!.footprint.streams.find(
                (s) => s.id === a.target,
              )!;
              w.setDrawer({ kind: "stream", data: s });
            }}
          >
            Inspect target stream
            <ArrowUpRight size={14} />
          </button>
        )}
      </section>
      {!refused && (
        <section className="drawer-section">
          <h3>How was this calculated?</h3>
          <div className="formula">
            LCOA = (CRF × CAPEX + ΔOPEX − gross saving) / annual abatement
          </div>
          <DetailRows
            rows={[
              ["Savings model", label(a.savings_model)],
              [
                "Cost of capital",
                number((w.assessment?.plant.discount_rate || 0) * 100, 1) + "%",
              ],
            ]}
          />
          <p>
            CAPEX is annualised using the capital recovery factor over the asset
            lifetime. Missing inputs remain unavailable.
          </p>
        </section>
      )}
      <section className="drawer-section">
        <h3>Evidence & constraints</h3>
        <Badge>{label(a.confidence)} confidence</Badge>
        <p>{a.evidence}</p>
        <ul className="plain-list">
          {a.caveats.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
      <section className="drawer-section" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1.25rem", marginTop: "1rem" }}>
        <div className="eyebrow" style={{ color: "var(--brand-teal)" }}>IMPLEMENTATION WORKSPACE</div>
        <h3 style={{ margin: "0.25rem 0 0.5rem 0" }}>Find Providers & Request Quotes</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          Connect directly with verified equipment manufacturers, ESCOs, and installers matching this specific intervention.
        </p>
        <Link
          className="button"
          to={`/marketplace?intervention=${encodeURIComponent(a.id)}`}
          onClick={() => w.setDrawer(null)}
          style={{ width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
        >
          Find Matching Providers & Request Quotes ↗
        </Link>
      </section>
    </>
  );
}
function StreamDetail({ s }: { s: Stream }) {
  const w = useWorkspace();
  const factor = w.reference.data?.find((f) => f.key === s.factor_key);
  return (
    <>
      <div className="drawer-chips">
        <Badge>Scope {s.scope}</Badge>
        <Badge>{s.category}</Badge>
      </div>
      <div className="drawer-hero">
        {number(s.emissions.base)}
        <span>tCO₂e / yr</span>
      </div>
      <p>{number(s.share_pct, 1)}% of the annual footprint</p>
      <section className="drawer-section">
        <h3>Activity → factor → emissions</h3>
        <div className="formula">
          Activity × emission factor × unit conversion
        </div>
        <DetailRows
          rows={[
            ["Activity", number(s.quantity, 2) + " " + s.unit],
            [
              "Emission factor",
              factor
                ? number(factor.value, 3) + " " + factor.unit
                : "Unavailable",
            ],
            ["Base emissions", number(s.emissions.base) + " tCO₂e"],
            [
              "Low / high",
              number(s.emissions.low) +
                " / " +
                number(s.emissions.high) +
                " tCO₂e",
            ],
          ]}
        />
        <Note>{s.working}</Note>
      </section>
      <section className="drawer-section">
        <h3>Data quality & evidence</h3>
        <EvidenceStatus />
      </section>
      <section className="drawer-section">
        <h3>Factor provenance</h3>
        <p>{factor?.source || "Factor provenance was not supplied."}</p>
        {factor && (
          <button
            className="button"
            onClick={() => w.setDrawer({ kind: "factor", data: factor })}
          >
            Open emission factor
            <ArrowUpRight size={14} />
          </button>
        )}
      </section>
    </>
  );
}
function LeakDetail({ l }: { l: Leak }) {
  const w = useWorkspace();
  return (
    <>
      <div className="drawer-chips">
        <Badge tone={l.severity}>{label(l.severity)}</Badge>
        <Badge>{label(l.rule)}</Badge>
      </div>
      <p className="drawer-intro">{l.reason}</p>
      <BenchmarkStrip
        percentile={l.percentile}
        share={l.share_pct}
        structural={l.rule === "structural_hotspot"}
      />
      <DetailRows
        rows={[
          ["Footprint share", number(l.share_pct, 1) + "%"],
          ["Plant intensity", number(l.actual) + " " + l.unit],
          [
            "Sector p25 / p50 / p75",
            [l.p25, l.p50, l.p75].map((x) => number(x)).join(" / "),
          ],
          [
            "Peer percentile",
            l.percentile == null
              ? "No applicable benchmark"
              : "p" + number(l.percentile),
          ],
          [
            "Recovery to median",
            l.recoverable_t == null
              ? "Not benchmarked"
              : number(l.recoverable_t) + " tCO₂e / yr",
          ],
        ]}
      />
      <section className="drawer-section">
        <h3>Evidence & benchmark context</h3>
        <EvidenceStatus />
        <DetailRows
          rows={[
            [
              "Top-quartile boundary (p25)",
              l.p25 == null ? "Not supplied" : number(l.p25, 3) + " " + l.unit,
            ],
            ["Cohort / sample size", "Not supplied"],
            ["Benchmark period / source ID", "Not supplied"],
          ]}
        />
        <Note>
          Screening percentiles do not establish an anonymous factory cohort or
          its minimum sample size. No peer factory records are exposed.
        </Note>
      </section>
      <section className="drawer-section">
        <h3>Detection rule</h3>
        <div className="formula">
          {l.rule === "benchmark_breach"
            ? "Plant intensity > sector p75"
            : l.rule === "material_concentration"
              ? "Footprint share > 15% and intensity > sector p50"
              : "Footprint share > 25% with no applicable benchmark"}
        </div>
        <p>
          A leak is an excess or concentrated carbon stream. Literature
          benchmarks are indicative screening values.
        </p>
      </section>
      <section className="drawer-section">
        <h3>Related circular actions</h3>
        {w.assessment?.recommendations.items
          .filter((a) => a.target === l.stream_id)
          .map((a) => (
            <button
              className="related-row"
              key={a.id}
              onClick={() => w.setDrawer({ kind: "action", data: a })}
            >
              {a.name}
              <ArrowUpRight size={14} />
            </button>
          ))}
      </section>
    </>
  );
}
function FactorDetail({ f }: { f: Factor }) {
  return (
    <>
      <div className="drawer-chips">
        <Badge>{f.group}</Badge>
        <Badge>Scope {f.scope}</Badge>
        {f.state && <Badge>{f.state}</Badge>}
      </div>
      <div className="drawer-hero">{number(f.value, 3)}</div>
      <p>{f.unit}</p>
      <DetailRows
        rows={[
          ["Factor ID", f.key],
          ["Low estimate", number(f.low, 3)],
          ["Base estimate", number(f.value, 3)],
          ["High estimate", number(f.high, 3)],
          ["Source vintage", f.vintage || "Not supplied"],
        ]}
      />
      <section className="drawer-section">
        <h3>Source</h3>
        <p>{f.source}</p>
        <DetailRows
          rows={[
            ["Source registry ID", "Not supplied"],
            ["Publisher", "Not supplied"],
            ["Source version", "Not supplied"],
            ["Published / effective dates", "Not supplied"],
            ["Quality grade", "Not supplied"],
            ["Review status", "Not supplied"],
            ["Source link", "Not supplied"],
          ]}
        />
        <Note>
          A source label is not evidence of verification. The current reference
          record does not supply the registry metadata below.
        </Note>
      </section>
    </>
  );
}
export function RecordDrawer() {
  const w = useWorkspace(),
    r = w.drawer;
  const title = r?.kind === "calculation" ? r.title : r?.data.name;
  return (
    <Dialog.Root
      open={!!r}
      onOpenChange={(v) => {
        if (!v) w.setDrawer(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="record-drawer" data-lenis-prevent="true">
          <header className="drawer-header">
            <div>
              <div className="eyebrow">PRANGARA / {r?.kind.toUpperCase()}</div>
              <Dialog.Title>{title}</Dialog.Title>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close details">
              <X size={18} />
            </Dialog.Close>
          </header>
          <Dialog.Description className="sr-only">
            Calculation details, source information and limitations for {title}.
          </Dialog.Description>
          <div className="drawer-body">
            {r?.kind === "action" && <ActionDetail a={r.data} />}{" "}
            {r?.kind === "stream" && <StreamDetail s={r.data} />}{" "}
            {r?.kind === "leak" && <LeakDetail l={r.data} />}{" "}
            {r?.kind === "factor" && <FactorDetail f={r.data} />}{" "}
            {r?.kind === "calculation" && (
              <>
                <div className="formula">{r.formula}</div>
                <DetailRows rows={r.rows} />
                <Note>{r.note}</Note>
              </>
            )}
            <footer className="drawer-disclaimer">
              Screening-grade decision support. This is not an accredited energy
              audit, assurance, or a vendor quotation.
            </footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
