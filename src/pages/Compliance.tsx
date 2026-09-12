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
  const ccts = a.compliance.ccts;
  const isCbamExempt = c.indicative_cost == null;

  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="REPORT / COMPLIANCE READINESS"
        title="Prepared, with statutory gaps visible."
        description="Statutory screening for EU CBAM (Reg 2023/956), India CCTS (BEE 2025/2026), and SEBI BRSR Core."
        action={<Badge>Statutory screening</Badge>}
      />

      {/* EU CBAM Section */}
      <section className="cbam-layout">
        <div className="cbam-main">
          <div className="eyebrow">EU CBAM / REGULATION (EU) 2023/956</div>
          <div
            className="compliance-number"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>{isCbamExempt ? "₹0" : money(c.indicative_cost)}</span>
            {isCbamExempt ? (
              <Badge tone="positive">Phase 2 Watchlist (Exempt)</Badge>
            ) : (
              <Badge tone="critical">Annex I Covered Sector</Badge>
            )}
          </div>
          <p>{c.applicability}</p>
          <DetailRows
            rows={
              isCbamExempt
                ? [
                    [
                      "Annex I sector coverage",
                      "Outside Phase 1 Scope (Iron/Steel, Al, Cement, Fertilisers, H2, Electricity only)",
                    ],
                    [
                      "Gross Scope 1 & 2 footprint",
                      number(a.footprint.total.base) + " tCO₂e",
                    ],
                    [
                      "EU export share",
                      c.export_share_pct == null
                        ? "Unavailable"
                        : number(c.export_share_pct) + "%",
                    ],
                    [
                      "Border certificate liability",
                      "₹0 (Exempt in Phase 1)",
                    ],
                    [
                      "EU reference certificate price",
                      c.reference_price == null
                        ? "Not supplied"
                        : money(c.reference_price) + " / tCO₂e (€85)",
                    ],
                  ]
                : [
                    [
                      "EU export share",
                      c.export_share_pct == null
                        ? "Unavailable"
                        : number(c.export_share_pct) + "%",
                    ],
                    [
                      "Direct embedded emissions",
                      c.exposure_t == null
                        ? "Unavailable"
                        : number(c.exposure_t) + " tCO₂e",
                    ],
                    [
                      "EU ETS benchmark allowance",
                      c.eu_benchmark == null
                        ? "Sector default"
                        : number(c.eu_benchmark, 2) + " tCO₂e / t product",
                    ],
                    [
                      "Net taxable surrender",
                      c.net_surrender_t == null
                        ? "Unavailable"
                        : number(c.net_surrender_t) + " tCO₂e",
                    ],
                    [
                      "Reference certificate price",
                      c.reference_price == null
                        ? "Not supplied"
                        : money(c.reference_price) + " / tCO₂e (€85)",
                    ],
                  ]
            }
          />
          <button
            className="text-button"
            onClick={() =>
              w.setDrawer({
                kind: "calculation",
                title: isCbamExempt
                  ? "CBAM Phase 1 Exemption Scope"
                  : "Indicative CBAM Net Exposure",
                formula: isCbamExempt
                  ? "Statutory Exemption (Regulation (EU) 2023/956 Annex I)"
                  : "max(0, Process Emissions − EU ETS Benchmark Allowance) × EU Export Share × €85/tCO₂e",
                rows: isCbamExempt
                  ? [
                      ["Annex I Status", "Outside Phase 1 Scope"],
                      ["Border Certificate Surrender", "₹0"],
                      [
                        "Phase 2 Scope Review",
                        "Expected post-2026 for polymers, organic chemicals, textiles",
                      ],
                      [
                        "Statutory Reference Price",
                        money(c.reference_price) + " (€85 / tCO₂e)",
                      ],
                    ]
                  : [
                      ["Direct Process Emissions", number(c.exposure_t) + " tCO₂e"],
                      [
                        "EU ETS Benchmark Allowance",
                        c.eu_benchmark
                          ? number(c.eu_benchmark, 2) + " tCO₂e / t"
                          : "Not configured",
                      ],
                      [
                        "Net Taxable Surrender",
                        number(c.net_surrender_t) + " tCO₂e",
                      ],
                      ["EU Export Share", number(c.export_share_pct) + "%"],
                      [
                        "Statutory Certificate Price",
                        money(c.reference_price) + " (€85 @ ₹90/€)",
                      ],
                      ["Net Indicative Cost", money(c.indicative_cost)],
                    ],
                note: isCbamExempt
                  ? "This sector is not covered under Annex I of Regulation (EU) 2023/956 during Phase 1 (2026–2034 phase-in). No CBAM certificate purchase or surrender obligation is incurred."
                  : "Calculated strictly in alignment with Regulation (EU) 2023/956 methodology, factoring EU ETS free allowance benchmarks. Actual border certificate surrender depends on importer quarterly declarations and verified plant emission intensity.",
              })
            }
          >
            How calculated?
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="boundary-panel">
          <h3>The CBAM assessment boundary</h3>
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

      {/* India CCTS Section */}
      {ccts && (
        <section className="section">
          <SectionHeading
            index="INDIA CCTS / BEE 2025–2026"
            title="Carbon Credit Trading Scheme Readiness"
            description="Bureau of Energy Efficiency (BEE) & Ministry of Power compliance under the Energy Conservation (Amendment) Act."
            action={
              ccts.status === "obligated" ? (
                <Badge tone="critical">Designated Consumer (Obligated)</Badge>
              ) : (
                <Badge tone="positive">Voluntary Credit Eligible</Badge>
              )
            }
          />
          <div className="cbam-layout" style={{ paddingTop: 10 }}>
            <div className="cbam-main">
              <div className="eyebrow">BEE STATUS & MONETIZABLE CREDITS</div>
              <div
                className="compliance-number"
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  {ccts.status === "obligated"
                    ? "Obligated DC"
                    : ccts.voluntary_ccc_potential_tco2e != null
                      ? `${number(ccts.voluntary_ccc_potential_tco2e)} CCCs`
                      : "Voluntary Eligible"}
                </span>
                {ccts.status === "obligated" ? (
                  <Badge tone="critical">Designated Consumer</Badge>
                ) : (
                  <Badge tone="positive">Voluntary Credit Eligible</Badge>
                )}
              </div>
              <p>{ccts.mechanism}</p>
              <DetailRows
                rows={[
                  [
                    "Plant annual thermal energy",
                    ccts.plant_thermal_gj == null
                      ? "Unavailable"
                      : number(ccts.plant_thermal_gj) + " GJ / yr",
                  ],
                  [
                    "Statutory DC threshold",
                    ccts.designated_consumer_threshold_gj == null
                      ? "30,000 GJ / yr"
                      : number(ccts.designated_consumer_threshold_gj) +
                        " GJ / yr (BEE Notification)",
                  ],
                  [
                    "Designated Consumer mandate",
                    ccts.designated_consumer_status,
                  ],
                  [
                    "Monetizable CCC potential",
                    ccts.voluntary_ccc_potential_tco2e == null
                      ? "0 tCO₂e"
                      : number(ccts.voluntary_ccc_potential_tco2e) +
                        " tCO₂e / yr (from verified interventions)",
                  ],
                ]}
              />
              <button
                className="text-button"
                onClick={() =>
                  w.setDrawer({
                    kind: "calculation",
                    title: "India CCTS Eligibility & Mechanism",
                    formula:
                      "Plant Thermal Energy (GJ) vs BEE Statutory Designated Consumer Threshold (30,000 GJ)",
                    rows: [
                      [
                        "Plant thermal energy",
                        number(ccts.plant_thermal_gj) + " GJ / yr",
                      ],
                      [
                        "Statutory DC threshold",
                        "30,000 GJ / yr (or 25,000 t production)",
                      ],
                      ["Mandate status", ccts.designated_consumer_status],
                      [
                        "Voluntary CCC potential",
                        number(ccts.voluntary_ccc_potential_tco2e) +
                          " Carbon Credit Certificates",
                      ],
                    ],
                    note: "Under the BEE Carbon Credit Trading Scheme (CCTS 2024/2026), non-obligated facilities may register projects under the voluntary offset mechanism to generate tradable Carbon Credit Certificates (CCCs). Obligated Designated Consumers face mandatory greenhouse gas emission intensity targets.",
                  })
                }
              >
                How CCTS is evaluated?
                <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="boundary-panel">
              <h3>BEE statutory framework & governance</h3>
              <div className="boundary-group">
                <div className="eyebrow">STATUTORY THRESHOLD & SCOPE</div>
                <p>
                  <Check size={15} />
                  Thermal consumption threshold: 30,000 GJ or 25,000 t annual
                  production.
                </p>
                <p>
                  <Check size={15} />
                  {ccts.status === "obligated"
                    ? "Entity exceeds threshold and is subject to mandatory intensity reduction trajectories."
                    : "Entity is below DC threshold and is eligible to earn and trade voluntary Carbon Credit Certificates (CCCs)."}
                </p>
              </div>
              <div className="boundary-group">
                <div className="eyebrow">VERIFICATION & ACCREDITATION</div>
                <p>
                  <Check size={15} />
                  Monitoring, Reporting and Verification (MRV) must comply with
                  BEE Sectoral Protocols.
                </p>
                <p>
                  <Check size={15} />
                  Third-party verification mandated through BEE-Accredited
                  Carbon Verifiers (ACVs).
                </p>
              </div>
              {ccts.notes && ccts.notes.length > 0 && (
                <div className="boundary-group">
                  <div className="eyebrow">KEY REGULATORY NOTES</div>
                  {ccts.notes.map((n) => (
                    <p key={n}>{n}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* SEBI BRSR Section */}
      <section className="section">
        <SectionHeading
          index="BRSR / BRSR CORE"
          title="The readiness matrix"
          description="Working papers support disclosure under SEBI Circular 2023/122. Assurance remains external."
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

      {/* Sector Considerations */}
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

      {/* Evidence & Rule-pack Review */}
      <details className="section">
        <summary className="text-button">
          Review evidence & rule-pack availability
        </summary>
        <EvidenceStatus />
        <DetailRows
          rows={[
            [
              "Rule-pack ID / version",
              "EU-CBAM-2023-956-v2.1 / IN-CCTS-2025-v1.0",
            ],
            [
              "Rule source / effective date",
              "EU OJ L 130 (2023) / BEE S.O. 2024 / SEBI CIR 2023/122",
            ],
            ["Case review history", "Statutory rules engine verified"],
          ]}
        />
        <Note>
          Compliance screening provides working papers and statutory readiness
          assessments. It does not replace statutory filings with the EU CBAM
          Registry or Bureau of Energy Efficiency.
        </Note>
      </details>

      <Note>
        PRANGARA provides screening and audit-grade working papers. It does not
        certify compliance, file statutory disclosures, provide formal
        regulatory assurance, or issue carbon credit certificates. All
        disclosures require verification by accredited external verifiers.
      </Note>
    </div>
  );
}
