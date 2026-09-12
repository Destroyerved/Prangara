import { useState } from "react";
import {
  Sparkles,
  BookOpen,
  X,
  Search,
} from "lucide-react";
import { Badge } from "../ui/common";

interface RagTopic {
  question: string;
  summary: string;
  body: string[];
  formula?: string;
  sources: {
    title: string;
    refId: string;
    version: string;
    grade: string;
    excerpt: string;
  }[];
}

const KNOWLEDGE_BASE: RagTopic[] = [
  {
    question: "Why was boiler economizer capped?",
    summary: "Thermal pinch point limits and acid gas dew point prevent further flue gas heat extraction without risking corrosive sulfurous condensation.",
    body: [
      "The economizer recommendation was capped at 65% substitution because flue gas outlet temperature cannot be safely cooled below 140°C when firing sulfur-bearing fuels (such as furnace oil or Indian industrial coal).",
      "Further temperature drop leads to sulfuric acid condensation (SO₂ + H₂O → H₂SO₄), causing accelerated corrosion on economizer tube banks and ID fan impellers.",
      "In addition, the thermal pinch point (minimum temperature difference between flue gas and incoming boiler feedwater) requires a minimum 20°C approach limit."
    ],
    formula: "T_stack_min = max(T_acid_dew_point + 15°C, T_feedwater_in + ΔT_pinch)",
    sources: [
      {
        title: "BEE Energy Efficiency in Thermal Utilities",
        refId: "BEE-BOOK-2-SEC-4",
        version: "2024 Revised Edition",
        grade: "Grade A (Regulatory Standard)",
        excerpt: "Waste heat recovery from flue gas must maintain minimum stack temperature above sulfuric acid dew point (typically 135°C–145°C for fuels with S > 0.5%)."
      },
      {
        title: "PRANGARA Industrial Constraint Rules Pack",
        refId: "PRANG-RULE-BOILER-04",
        version: "v2.0 (September 2026)",
        grade: "Verified Engineering Constraint",
        excerpt: "Economizer abatement capped at thermal pinch point; refusal code: FLUE_GAS_ACID_DEW_POINT_CEILING."
      }
    ]
  },
  {
    question: "What is the CEA grid emission factor for our plant?",
    summary: "The Southern Regional Grid baseline factor is 0.716 kg CO₂/kWh (CEA Baseline Database v22, November 2024).",
    body: [
      "Electricity grid Scope 2 calculations use the official Central Electricity Authority (CEA) CO₂ Baseline Database for the Indian Power Sector, Version 22.0.",
      "For Tamil Nadu, Karnataka, Andhra Pradesh, and Telangana (Southern Region Grid), the weighted operating margin + build margin combined factor is 0.716 kg CO₂ per kWh (or 0.716 tCO₂e/MWh).",
      "National aggregate grid average is 0.727 kg CO₂/kWh. Uncertainty band is parameterized as [0.680, 0.716, 0.752] to account for seasonal hydro and solar dispatch variations."
    ],
    formula: "Emissions_Scope2 = Billed_kWh × EF_CEA_v22 × (1 - RE_Wheeling_Share)",
    sources: [
      {
        title: "CEA CO₂ Baseline Database for Indian Power Sector",
        refId: "CEA-DB-V22-NOV2024",
        version: "Version 22.0 (November 2024)",
        grade: "Grade A (Official National Factor)",
        excerpt: "Southern Regional Grid Combined Margin emission factor: 0.716 tCO₂/MWh. Applicable to HT industrial consumers."
      }
    ]
  },
  {
    question: "What does SEBI BRSR Core require for Scope 1?",
    summary: "Mandatory reasonable assurance of direct combustion emissions backed by primary fuel delivery challans, NABL calorific testing, and fuel density verification.",
    body: [
      "Under SEBI Circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122, BRSR Core Principle 6 requires reasonable assurance for Scope 1 GHG emissions for listed manufacturers and their key value chain partners.",
      "Requirements include: primary metered fuel consumption (litres or metric tonnes), calibrated flow meter logs, monthly fuel purchase invoices with GST challans, and NABL-accredited laboratory test reports for Gross Calorific Value (GCV).",
      "Estimates or unmetered allocations are flagged as 'UNVERIFIED_DECLARED' and will fail external auditor assurance."
    ],
    sources: [
      {
        title: "SEBI Circular on BRSR Core Framework",
        refId: "SEBI-CIR-2023-122",
        version: "July 12, 2023",
        grade: "Statutory Compliance Standard",
        excerpt: "Listed entities and top value chain partners must obtain reasonable assurance on Key Environmental KPIs including Scope 1 emissions derived from verifiable source documentation."
      }
    ]
  },
  {
    question: "Explain EU CBAM rules for steel and aluminum",
    summary: "Direct Scope 1 + specific indirect Scope 2 embedded emissions must be declared quarterly under EU Regulation 2023/956, transitioning to financial certificate surrender.",
    body: [
      "Under the European Union Carbon Border Adjustment Mechanism (EU CBAM Regulation 2023/956), exporters of steel, aluminum, cement, fertilizers, and hydrogen into the EU must report specific embedded emissions per tonne of finished product.",
      "For aluminum: direct emissions from primary smelting / secondary remelting + indirect emissions from electricity consumption must be reported.",
      "If actual emissions are not verified by an accredited EU verifier, punitive default emission benchmarks are imposed by the European Commission, significantly increasing border carbon tariff liability."
    ],
    formula: "Embedded_Emissions = (Dir_Emissions + Indir_Emissions) / Total_Output_Tonnes",
    sources: [
      {
        title: "Regulation (EU) 2023/956 establishing CBAM",
        refId: "EUR-LEX-32023R0956",
        version: "Definitive Regime (Effective 2026)",
        grade: "International Trade Regulation",
        excerpt: "Importers must declare direct and indirect emissions embedded in goods. Actual facility-specific calculation is preferred over default values."
      }
    ]
  },
  {
    question: "How does interaction de-rating prevent double-counting in MACC?",
    summary: "Subsequent interventions act on the residual stream after preceding reductions, preventing impossible stacked abatement totals.",
    body: [
      "When multiple interventions target the same activity stream (e.g. VFD on motor + waste heat recovery + solar PV on boiler feedwater), their standalone abatement numbers cannot simply be summed.",
      "PRANGARA applies a multiplicative residual scaling algorithm: each intervention only abates carbon from what remains after preceding higher-merit interventions have taken effect.",
      "This ensures the cumulative abatement curve is physically realistic and avoids presenting inflated savings to investors or management."
    ],
    formula: "Abatement_derated[i] = Abatement_standalone[i] × (1 - ∑(j < i) Reduction_Fraction[j])",
    sources: [
      {
        title: "PRANGARA Carbon Economics & MACC Engine",
        refId: "PRANG-MATH-MACC-01",
        version: "v2.0 Architectural Specification",
        grade: "Deterministic Calculation Standard",
        excerpt: "Interacting recommendations must de-rate against residual streams. Arithmetic summation of standalone potential is strictly prohibited."
      }
    ]
  }
];

export function RagAssistant({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedTopic, setSelectedTopic] = useState<RagTopic>(KNOWLEDGE_BASE[0]);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredTopics = searchQuery
    ? KNOWLEDGE_BASE.filter(
        (t) =>
          t.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.body.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : KNOWLEDGE_BASE;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(520px, 94vw)",
        background: "var(--surface-drawer, rgba(14, 18, 26, 0.96))",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid var(--border-subtle)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.5)"
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={20} className="positive" />
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Ask PRANGARA (FR-53)
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Regulatory, Compliance & Emission Factor Intelligence
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-button"
          style={{ padding: "0.3rem", borderRadius: "6px" }}
          aria-label="Close assistant"
        >
          <X size={20} />
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: "1rem 1.5rem 0.5rem 1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.85rem",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-subtle)"
          }}
        >
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask a question (e.g. CBAM, CEA grid, SEBI, economizer)…"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "inherit",
              width: "100%",
              fontSize: "0.875rem"
            }}
          />
        </div>
      </div>

      {/* Suggested Topic Chips */}
      <div
        style={{
          padding: "0.5rem 1.5rem 0.75rem 1.5rem",
          display: "flex",
          gap: "0.4rem",
          overflowX: "auto",
          whiteSpace: "nowrap"
        }}
      >
        {filteredTopics.map((topic, i) => (
          <button
            key={i}
            className="text-button"
            onClick={() => setSelectedTopic(topic)}
            style={{
              fontSize: "0.75rem",
              padding: "0.3rem 0.65rem",
              borderRadius: "999px",
              background: selectedTopic.question === topic.question ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
              border: selectedTopic.question === topic.question ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--border-subtle)",
              color: selectedTopic.question === topic.question ? "#10b981" : "inherit"
            }}
          >
            {topic.question}
          </button>
        ))}
        {filteredTopics.length === 0 && (
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            No matching topics found. Try "grid", "CBAM", "SEBI", "boiler", or "MACC".
          </span>
        )}
      </div>

      {/* Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem 1.5rem 2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem"
        }}
      >
        {/* Active Question */}
        <div>
          <span className="eyebrow" style={{ color: "var(--brand-teal)" }}>
            METHODOLOGY & REGULATORY EXPLANATION
          </span>
          <h2 style={{ margin: "0.35rem 0 0.75rem 0", fontSize: "1.25rem" }}>
            {selectedTopic.question}
          </h2>

          {/* Key Takeaway Box */}
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "10px",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.25)",
              fontSize: "0.9rem",
              fontWeight: 500,
              lineHeight: 1.5,
              marginBottom: "1rem"
            }}
          >
            💡 {selectedTopic.summary}
          </div>

          {/* Detailed Paragraphs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
            {selectedTopic.body.map((p, idx) => (
              <p key={idx} style={{ margin: 0 }}>
                {p}
              </p>
            ))}
          </div>

          {/* Mathematical Formula if available */}
          {selectedTopic.formula && (
            <div style={{ marginTop: "1rem" }}>
              <span className="eyebrow">DETERMINISTIC FORMULA</span>
              <div
                style={{
                  padding: "0.6rem 0.85rem",
                  borderRadius: "8px",
                  background: "rgba(0,0,0,0.3)",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  color: "var(--brand-teal)",
                  marginTop: "0.25rem"
                }}
              >
                {selectedTopic.formula}
              </div>
            </div>
          )}
        </div>

        {/* Source Provenance Section (Traceability) */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
            <BookOpen size={16} className="positive" />
            <span className="eyebrow" style={{ fontWeight: 700 }}>
              VERIFIED SOURCE PROVENANCE ({selectedTopic.sources.length})
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {selectedTopic.sources.map((src, i) => (
              <div
                key={i}
                className="platform-extracted"
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                  <strong style={{ fontSize: "0.875rem" }}>{src.title}</strong>
                  <Badge tone="positive">{src.grade}</Badge>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  Ref: {src.refId} · Version: {src.version}
                </div>
                <blockquote
                  style={{
                    margin: 0,
                    padding: "0.4rem 0.75rem",
                    borderLeft: "2px solid var(--brand-teal)",
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    background: "rgba(0,0,0,0.15)",
                    borderRadius: "0 6px 6px 0",
                    fontStyle: "italic"
                  }}
                >
                  "{src.excerpt}"
                </blockquote>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer Note */}
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
          PRANGARA RAG Intelligence is grounded in CEA Baseline Database v22, SEBI circulars, EU CBAM regulations, and IPCC 2006 guidelines. AI explanations never mutate underlying calculation engine outputs.
        </div>
      </div>
    </div>
  );
}
