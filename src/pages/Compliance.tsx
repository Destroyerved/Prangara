import { useWorkspace } from "../hooks/useWorkspace";
import {
  PageHeading,
  SectionHeading,
  Badge,
  DetailRows,
  Note,
  Empty,
  Skeleton,
} from "../components/ui/common";
import { EvidenceStatus } from "../components/ui/EvidenceStatus";
import { money, number } from "../lib/format";
import { ArrowUpRight, Check, Minus, ExternalLink } from "lucide-react";
export default function Compliance() {
  const w = useWorkspace(),
    a = w.assessment;
  if (!a) return <Skeleton />;
  const c = a.compliance.cbam;
  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="REPORT / COMPLIANCE READINESS"
        title="Prepared, with the gaps visible."
        description="Screening-grade visibility for carbon-related reporting obligations."
        action={<Badge>Screening grade</Badge>}
      />
      <section className="cbam-layout">
        <div className="cbam-main">
          <div className="eyebrow">CBAM / INDICATIVE EXPOSURE</div>
          <div className="compliance-number">{money(c.indicative_cost)}</div>
          <p>{c.applicability}</p>
          <DetailRows
            rows={[
              [
                "EU export share",
                c.export_share_pct == null
                  ? "Unavailable"
                  : number(c.export_share_pct) + "%",
              ],
              [
                "Modelled embedded emissions",
                c.exposure_t == null
                  ? "Unavailable"
                  : number(c.exposure_t) + " tCO₂e",
              ],
              [
                "Reference certificate price",
                c.reference_price == null
                  ? "Not supplied"
                  : money(c.reference_price) + " / tCO₂e",
              ],
            ]}
          />
          <button
            className="text-button"
            onClick={() =>
              w.setDrawer({
                kind: "calculation",
                title: "Indicative CBAM exposure",
                formula:
                  "(Scope 1 + Scope 2) × EU export share × reference price",
                rows: [
                  ["Export share", number(c.export_share_pct) + "%"],
                  ["Reference price", money(c.reference_price)],
                  ["Indicative cost", money(c.indicative_cost)],
                ],
                note: "The report describes a simplified screening formula, not a legal liability calculation. Goods coverage and applicable rules must be verified. Precursor emissions are excluded.",
              })
            }
          >
            How calculated?
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="boundary-panel">
          <h3>The assessment boundary</h3>
          <div className="boundary-group">
            <div className="eyebrow">INCLUDED IN THE SCREENING MODEL</div>
            {c.included.map((v) => (
              <p key={v}>
                <Check size={15} />
                {v}
              </p>
            ))}
          </div>
          <div className="boundary-group">
            <div className="eyebrow">EXCLUDED</div>
            {c.excluded.map((v) => (
              <p key={v}>
                <Minus size={15} />
                {v}
              </p>
            ))}
          </div>
          <div className="boundary-group">
            <div className="eyebrow">ASSUMPTIONS TO CONFIRM</div>
            {c.assumptions.map((v) => (
              <p key={v}>{v}</p>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <SectionHeading
          index="BRSR / BRSR CORE"
          title="The readiness matrix"
          description="Working papers support disclosure. Assurance remains external."
        />
        {a.compliance.brsr.length ? (
          <div className="readiness-table">
            <div className="readiness-header">
              <span>Requirement</span>
              <span>Readiness</span>
              <span>Evidence / next action</span>
            </div>
            {a.compliance.brsr.map((row) => (
              <button
                className="readiness-row"
                key={row.name}
                onClick={() =>
                  w.setDrawer({
                    kind: "calculation",
                    title: row.name,
                    formula: "Evidence → review → disclosure readiness",
                    rows: [["Status", row.status]],
                    note: row.detail,
                  })
                }
              >
                <strong>{row.name}</strong>
                <Badge
                  tone={
                    row.status === "Ready"
                      ? "positive"
                      : row.status === "Missing"
                        ? "critical"
                        : "moderate"
                  }
                >
                  {row.status}
                </Badge>
                <p>{row.detail}</p>
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title="Readiness data not supplied"
            description="The engine must return evidence-based statuses for this plant."
          />
        )}
      </section>
      <section className="section">
        <SectionHeading title="Sector considerations" />
        <div className="regulatory-flags">
          {w.sector.data?.regulatory_flags.map((flag) => (
            <div key={flag}>
              <ExternalLink size={16} />
              {flag}
            </div>
          ))}
        </div>
      </section>
      <details className="section">
        <summary className="text-button">
          Review evidence & rule-pack availability
        </summary>
        <EvidenceStatus />
        <DetailRows
          rows={[
            ["Rule-pack ID / version", "Not supplied"],
            ["Rule source / effective date", "Not supplied"],
            ["Case review history", "Not supplied"],
          ]}
        />
        <Note>
          Additional CPCB, PAT and CCTS evaluation requires configured, reviewed
          rule packs. No additional applicability result is available.
        </Note>
      </details>
      <Note>
        PRANGARA provides screening and working papers. It does not certify
        compliance, file disclosures, provide regulatory assurance, or verify
        carbon credits.
      </Note>
    </div>
  );
}
