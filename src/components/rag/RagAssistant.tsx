import { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  X,
  Search,
  Copy,
  Check,
  ShieldCheck,
  FileText,
  CornerDownLeft,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "../ui/common";

interface SourceCitation {
  title: string;
  refId: string;
  version: string;
  grade: string;
  excerpt: string;
}

interface RagTopic {
  id: string;
  category: "thermal" | "grid" | "compliance" | "cbam" | "math";
  categoryLabel: string;
  question: string;
  summary: string;
  body: string[];
  formula?: string;
  sources: SourceCitation[];
  keywords: string[];
}

const KNOWLEDGE_BASE: RagTopic[] = [
  {
    id: "economizer",
    category: "thermal",
    categoryLabel: "Boiler & Thermal Utilities",
    question: "Why was boiler economizer capped?",
    summary:
      "Thermal pinch point limits and acid gas dew point prevent further flue gas heat extraction without risking corrosive sulfurous condensation.",
    body: [
      "The economizer recommendation was capped at 65% substitution because flue gas outlet temperature cannot be safely cooled below 140°C when firing sulfur-bearing fuels (such as furnace oil or Indian industrial coal).",
      "Further temperature drop leads to sulfuric acid condensation (SO₂ + H₂O → H₂SO₄), causing accelerated corrosion on economizer tube banks and ID fan impellers.",
      "In addition, the thermal pinch point (minimum temperature difference between flue gas and incoming boiler feedwater) requires a minimum 20°C approach limit.",
    ],
    formula: "T_stack_min = max(T_acid_dew_point + 15°C, T_feedwater_in + ΔT_pinch)",
    sources: [
      {
        title: "BEE Energy Efficiency in Thermal Utilities",
        refId: "BEE-BOOK-2-SEC-4",
        version: "2024 Revised Edition",
        grade: "Grade A (Regulatory Standard)",
        excerpt:
          "Waste heat recovery from flue gas must maintain minimum stack temperature above sulfuric acid dew point (typically 135°C–145°C for fuels with S > 0.5%).",
      },
      {
        title: "PRANGARA Industrial Constraint Rules Pack",
        refId: "PRANG-RULE-BOILER-04",
        version: "v2.0 (September 2026)",
        grade: "Verified Engineering Constraint",
        excerpt:
          "Economizer abatement capped at thermal pinch point; refusal code: FLUE_GAS_ACID_DEW_POINT_CEILING.",
      },
    ],
    keywords: ["boiler", "economizer", "flue", "dew point", "acid", "pinch", "thermal", "steam"],
  },
  {
    id: "cea-grid",
    category: "grid",
    categoryLabel: "Grid & Scope 2 Power",
    question: "What is the CEA grid emission factor for our plant?",
    summary:
      "The Southern Regional Grid baseline factor is 0.716 kg CO₂/kWh (CEA Baseline Database v22, November 2024).",
    body: [
      "Electricity grid Scope 2 calculations use the official Central Electricity Authority (CEA) CO₂ Baseline Database for the Indian Power Sector, Version 22.0.",
      "For Tamil Nadu, Karnataka, Andhra Pradesh, and Telangana (Southern Region Grid), the weighted operating margin + build margin combined factor is 0.716 kg CO₂ per kWh (or 0.716 tCO₂e/MWh).",
      "National aggregate grid average is 0.727 kg CO₂/kWh. Uncertainty band is parameterized as [0.680, 0.716, 0.752] to account for seasonal hydro and solar dispatch variations.",
    ],
    formula: "Emissions_Scope2 = Billed_kWh × EF_CEA_v22 × (1 - RE_Wheeling_Share)",
    sources: [
      {
        title: "CEA CO₂ Baseline Database for Indian Power Sector",
        refId: "CEA-DB-V22-NOV2024",
        version: "Version 22.0 (November 2024)",
        grade: "Grade A (Official National Factor)",
        excerpt:
          "Southern Regional Grid Combined Margin emission factor: 0.716 tCO₂/MWh. Applicable to HT industrial consumers.",
      },
    ],
    keywords: ["cea", "grid", "emission factor", "kwh", "electricity", "scope 2", "southern", "power"],
  },
  {
    id: "sebi-brsr",
    category: "compliance",
    categoryLabel: "SEBI BRSR Core",
    question: "What does SEBI BRSR Core require for Scope 1?",
    summary:
      "Mandatory reasonable assurance of direct combustion emissions backed by primary fuel delivery challans, NABL calorific testing, and fuel density verification.",
    body: [
      "Under SEBI Circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122, BRSR Core Principle 6 requires reasonable assurance for Scope 1 GHG emissions for listed manufacturers and their top value chain partners.",
      "Requirements include: primary metered fuel consumption (litres or metric tonnes), calibrated flow meter logs, monthly fuel purchase invoices with GST challans, and NABL-accredited laboratory test reports for Gross Calorific Value (GCV).",
      "Estimates or unmetered allocations are flagged as 'UNVERIFIED_DECLARED' and will fail external auditor assurance.",
    ],
    sources: [
      {
        title: "SEBI Circular on BRSR Core Framework",
        refId: "SEBI-CIR-2023-122",
        version: "July 12, 2023",
        grade: "Statutory Compliance Standard",
        excerpt:
          "Listed entities and top value chain partners must obtain reasonable assurance on Key Environmental KPIs including Scope 1 emissions derived from verifiable source documentation.",
      },
    ],
    keywords: ["sebi", "brsr", "scope 1", "assurance", "nabl", "audit", "compliance", "gst", "invoice"],
  },
  {
    id: "cbam",
    category: "cbam",
    categoryLabel: "EU CBAM Regulation",
    question: "Explain EU CBAM rules for steel and aluminum",
    summary:
      "Direct Scope 1 + specific indirect Scope 2 embedded emissions must be declared quarterly under EU Regulation 2023/956, transitioning to financial certificate surrender.",
    body: [
      "Under the European Union Carbon Border Adjustment Mechanism (EU CBAM Regulation 2023/956), exporters of steel, aluminum, cement, fertilizers, and hydrogen into the EU must report specific embedded emissions per tonne of finished product.",
      "For aluminum: direct emissions from primary smelting / secondary remelting + indirect emissions from electricity consumption must be reported.",
      "If actual emissions are not verified by an accredited EU verifier, punitive default emission benchmarks are imposed by the European Commission, significantly increasing border carbon tariff liability.",
    ],
    formula: "Embedded_Emissions = (Dir_Emissions + Indir_Emissions) / Total_Output_Tonnes",
    sources: [
      {
        title: "Regulation (EU) 2023/956 establishing CBAM",
        refId: "EUR-LEX-32023R0956",
        version: "Definitive Regime (Effective 2026)",
        grade: "International Trade Regulation",
        excerpt:
          "Importers must declare direct and indirect emissions embedded in goods. Actual facility-specific calculation is preferred over default values.",
      },
    ],
    keywords: ["cbam", "eu", "export", "steel", "aluminum", "tariff", "embedded", "border", "regulation"],
  },
  {
    id: "macc-derating",
    category: "math",
    categoryLabel: "MACC Calculation Math",
    question: "How does interaction de-rating prevent double-counting in MACC?",
    summary:
      "Subsequent interventions act on the residual stream after preceding reductions, preventing impossible stacked abatement totals.",
    body: [
      "When multiple interventions target the same activity stream (e.g. VFD on motor + waste heat recovery + solar PV on boiler feedwater), their standalone abatement numbers cannot simply be summed.",
      "PRANGARA applies a multiplicative residual scaling algorithm: each intervention only abates carbon from what remains after preceding higher-merit interventions have taken effect.",
      "This ensures the cumulative abatement curve is physically realistic and avoids presenting inflated savings to investors or management.",
    ],
    formula: "Abatement_derated[i] = Abatement_standalone[i] × (1 - ∑(j < i) Reduction_Fraction[j])",
    sources: [
      {
        title: "PRANGARA Carbon Economics & MACC Engine",
        refId: "PRANG-MATH-MACC-01",
        version: "v2.0 Architectural Specification",
        grade: "Deterministic Calculation Standard",
        excerpt:
          "Interacting recommendations must de-rate against residual streams. Arithmetic summation of standalone potential is strictly prohibited.",
      },
    ],
    keywords: ["macc", "double counting", "derating", "residual", "formula", "curve", "stacking"],
  },
  {
    id: "biomass-fuel",
    category: "thermal",
    categoryLabel: "Boiler & Thermal Utilities",
    question: "What is the emission factor for biomass briquettes vs furnace oil?",
    summary:
      "Biomass briquettes carry a net biogenic Scope 1 factor of 0 kg CO₂e/kg under GHG Protocol, replacing furnace oil at 2.85 kg CO₂/litre.",
    body: [
      "Furnace oil has an emission factor of 2.85 kg CO₂ per litre (NCV ~10,200 kcal/kg). In contrast, agricultural residue briquettes (groundnut shell, mustard stalk, bagasse) are classified as biogenic carbon.",
      "Under GHG Protocol Corporate Standard and SEBI BRSR guidelines, direct biogenic combustion emissions are reported outside Scope 1 (memorandum item), achieving an effective ~92% reduction in reportable net GHG liability.",
      "Boiler retrofitting requires dual-fuel burners or fluidized bed combustion (FBC) with automated ash handling to accommodate 15%–20% higher particulate volumes.",
    ],
    formula: "Net_Abatement = Fuel_avoided_litres × 2.85 kg_CO₂/L - Biomass_transport_tCO₂e",
    sources: [
      {
        title: "IPCC 2006 Guidelines for National GHG Inventories",
        refId: "IPCC-VOL2-CH2-STAT",
        version: "Volume 2: Stationary Combustion",
        grade: "International Standard",
        excerpt: "Biomass emissions from sustainable agricultural residues are accounted as zero in direct energy Scope 1 portfolios.",
      },
    ],
    keywords: ["biomass", "briquettes", "furnace oil", "fuel switch", "biogenic", "ghg protocol", "boiler"],
  },
  {
    id: "solar-rooftop",
    category: "grid",
    categoryLabel: "Grid & Scope 2 Power",
    question: "How is rooftop solar abatement quantified with grid wheeling?",
    summary:
      "Direct on-site captive generation offsets grid electricity at 1:1, abating emissions at the regional CEA baseline factor.",
    body: [
      "Rooftop captive solar generation displaces grid electricity drawn at the meter, reducing Scope 2 emissions without transmission loss penalties.",
      "For grid-connected industrial systems under open-access or net-metering regulations, banked units exported during off-peak hours offset daytime peak draw.",
      "In the Southern Regional Grid, every 1,000 kWh of on-site solar generation eliminates 0.716 tonnes of CO₂e directly from the annual compliance ledger.",
    ],
    formula: "Solar_Abatement_tCO₂e = Solar_Generation_MWh × EF_CEA_Southern (0.716)",
    sources: [
      {
        title: "Ministry of New and Renewable Energy (MNRE)",
        refId: "MNRE-RTS-GUIDELINES-2025",
        version: "National Rooftop Solar Scheme",
        grade: "Regulatory Framework",
        excerpt: "Captive generation provides immediate Scope 2 offset against DISCOM utility bills.",
      },
    ],
    keywords: ["solar", "rooftop", "photovoltaic", "pv", "wheeling", "scope 2", "clean energy"],
  },
];

const CATEGORIES = [
  { id: "all", label: "All Topics" },
  { id: "thermal", label: "Boilers & Thermal" },
  { id: "grid", label: "Grid (Scope 2)" },
  { id: "compliance", label: "SEBI BRSR" },
  { id: "cbam", label: "EU CBAM" },
  { id: "math", label: "MACC Math" },
] as const;

export function RagAssistant({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedTopic, setSelectedTopic] = useState<RagTopic>(KNOWLEDGE_BASE[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [copiedFormula, setCopiedFormula] = useState(false);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter topics based on search query and category
  const filteredTopics = KNOWLEDGE_BASE.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    if (!searchQuery.trim()) return matchesCategory;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.question.toLowerCase().includes(q) ||
      t.summary.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.includes(q)) ||
      t.body.some((b) => b.toLowerCase().includes(q)) ||
      t.sources.some((s) => s.title.toLowerCase().includes(q) || s.refId.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  const handleCopyFormula = (formulaText: string) => {
    navigator.clipboard.writeText(formulaText);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  const handleCopyAnswer = () => {
    const fullText = `Q: ${selectedTopic.question}\n\nKey Insight:\n${selectedTopic.summary}\n\nDetails:\n${selectedTopic.body.join("\n\n")}\n\nFormula: ${selectedTopic.formula || "N/A"}\n\nSource: ${selectedTopic.sources.map((s) => `${s.title} (${s.refId})`).join(", ")}`;
    navigator.clipboard.writeText(fullText);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(8, 12, 20, 0.55)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              zIndex: 998,
            }}
          />

          {/* Assistant Floating Island Panel (Detached with 16px gap & curved borders) */}
          <motion.aside
            role="dialog"
            aria-label="Ask PRANGARA Intelligence Assistant"
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 270, mass: 0.8 }}
            style={{
              position: "fixed",
              top: "16px",
              right: "16px",
              bottom: "16px",
              width: "min(580px, calc(100vw - 32px))",
              height: "calc(100vh - 32px)",
              maxHeight: "calc(100vh - 32px)",
              borderRadius: "24px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              background: "rgba(11, 18, 30, 0.84)",
              backdropFilter: "blur(32px) saturate(200%)",
              WebkitBackdropFilter: "blur(32px) saturate(200%)",
              boxShadow: "0 25px 70px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 8px 32px rgba(0, 0, 0, 0.45)",
              zIndex: 999,
              display: "flex",
              flexDirection: "column",
              color: "var(--text)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(16, 185, 129, 0.25) 100%)",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                    color: "#38bdf8",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                      Ask PRANGARA
                    </h2>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        background: "rgba(16, 185, 129, 0.12)",
                        color: "#10b981",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#10b981",
                        }}
                      />
                      Grounded
                    </span>
                  </div>
                  <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Regulatory Intelligence & Formula Provenance
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close assistant"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modern Search & Prompt Box */}
            <div style={{ padding: "1rem 1.5rem 0.6rem 1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.65rem 0.95rem",
                  borderRadius: "12px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                <Search size={17} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask a question (e.g. CEA grid, SEBI Scope 1, CBAM, economizer)…"
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text)",
                    width: "100%",
                    fontSize: "0.88rem",
                  }}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "2px",
                    }}
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      background: "var(--surface-hover)",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      border: "1px solid var(--border)",
                      fontFamily: "monospace",
                    }}
                  >
                    Esc
                  </span>
                )}
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div
              style={{
                padding: "0.25rem 1.5rem 0.5rem 1.5rem",
                display: "flex",
                gap: "0.4rem",
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: isActive ? 600 : 500,
                      padding: "0.3rem 0.75rem",
                      borderRadius: "999px",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      background: isActive ? "var(--text)" : "var(--surface)",
                      color: isActive ? "var(--bg)" : "var(--text)",
                      border: isActive ? "1px solid var(--text)" : "1px solid var(--border)",
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Question Chips Carousel (clean, NO harsh scrollbar) */}
            <div
              style={{
                padding: "0.2rem 1.5rem 0.75rem 1.5rem",
                display: "flex",
                gap: "0.5rem",
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {filteredTopics.map((topic) => {
                const isSelected = selectedTopic.id === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopic(topic)}
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: isSelected ? 600 : 400,
                      padding: "0.4rem 0.85rem",
                      borderRadius: "8px",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      transition: "all 0.2s ease",
                      background: isSelected
                        ? "rgba(56, 189, 248, 0.12)"
                        : "var(--surface)",
                      border: isSelected
                        ? "1px solid rgba(56, 189, 248, 0.45)"
                        : "1px solid var(--border)",
                      color: isSelected ? "#38bdf8" : "var(--text)",
                    }}
                  >
                    <span style={{ opacity: isSelected ? 1 : 0.6 }}>•</span>
                    {topic.question}
                  </button>
                );
              })}

              {filteredTopics.length === 0 && (
                <div
                  style={{
                    padding: "0.4rem 0.5rem",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Info size={14} />
                  No direct topic found for "{searchQuery}". Try selecting a category or search terms like "grid", "boiler", or "CBAM".
                </div>
              )}
            </div>

            {/* Body Content Area with sleek scrollbar & high-contrast typography */}
            <div
              className="rag-scroll-container"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1.25rem 1.65rem 2rem 1.65rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {/* Question Header & Category */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                  <span
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#38bdf8",
                    }}
                  >
                    {selectedTopic.categoryLabel}
                  </span>
                  <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                    Verified Statutory Benchmark
                  </span>
                </div>

                <h3
                  style={{
                    margin: "0 0 0.85rem 0",
                    fontSize: "1.32rem",
                    fontWeight: 700,
                    lineHeight: 1.35,
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {selectedTopic.question}
                </h3>

                {/* Key Insight Hero Card */}
                <div
                  style={{
                    padding: "1.1rem 1.25rem",
                    borderRadius: "14px",
                    background:
                      "linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(56, 189, 248, 0.08) 100%)",
                    border: "1px solid rgba(16, 185, 129, 0.38)",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    <div
                      style={{
                        padding: "0.35rem",
                        borderRadius: "8px",
                        background: "rgba(16, 185, 129, 0.2)",
                        color: "#10b981",
                        marginTop: "1px",
                        flexShrink: 0,
                      }}
                    >
                      <Sparkles size={17} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "#10b981",
                          marginBottom: "0.35rem",
                        }}
                      >
                        Authoritative Key Takeaway
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.95rem",
                          fontWeight: 500,
                          lineHeight: 1.6,
                          color: "#f8fafc",
                        }}
                      >
                        {selectedTopic.summary}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Explanation Paragraphs (Easy to See & High Contrast) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.9rem",
                  fontSize: "0.94rem",
                  lineHeight: 1.72,
                  color: "#e2e8f0",
                }}
              >
                {selectedTopic.body.map((para, idx) => (
                  <p key={idx} style={{ margin: 0 }}>
                    {para}
                  </p>
                ))}
              </div>

              {/* Deterministic Mathematical Formula Block */}
              {selectedTopic.formula && (
                <div
                  style={{
                    borderRadius: "14px",
                    border: "1px solid rgba(56, 189, 248, 0.28)",
                    background: "rgba(10, 15, 26, 0.6)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 1rem",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                      background: "rgba(255, 255, 255, 0.03)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <FileText size={15} style={{ color: "#38bdf8" }} />
                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "#94a3b8",
                        }}
                      >
                        Deterministic Calculation Formula
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyFormula(selectedTopic.formula!)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.74rem",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "6px",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        background: "rgba(255, 255, 255, 0.06)",
                        color: copiedFormula ? "#10b981" : "#f1f5f9",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {copiedFormula ? <Check size={13} /> : <Copy size={13} />}
                      {copiedFormula ? "Copied!" : "Copy formula"}
                    </button>
                  </div>

                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, monospace)",
                      fontSize: "0.88rem",
                      color: "#38bdf8",
                      background: "rgba(0, 0, 0, 0.35)",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {selectedTopic.formula}
                  </div>
                </div>
              )}

              {/* Source Provenance Citation Cards */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.85rem",
                  }}
                >
                  <BookOpen size={16} style={{ color: "#10b981" }} />
                  <span
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#ffffff",
                    }}
                  >
                    Verified Source Provenance ({selectedTopic.sources.length})
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {selectedTopic.sources.map((src, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "1.1rem 1.2rem",
                        borderRadius: "14px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          marginBottom: "0.4rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                          <ShieldCheck size={17} style={{ color: "#10b981", flexShrink: 0 }} />
                          <h4 style={{ margin: 0, fontSize: "0.93rem", fontWeight: 600, color: "#f8fafc" }}>
                            {src.title}
                          </h4>
                        </div>
                        <Badge tone="positive">{src.grade}</Badge>
                      </div>

                      <div
                        style={{
                          fontSize: "0.76rem",
                          color: "#94a3b8",
                          marginBottom: "0.7rem",
                          display: "flex",
                          gap: "0.6rem",
                        }}
                      >
                        <span>
                          Ref: <strong style={{ color: "#e2e8f0" }}>{src.refId}</strong>
                        </span>
                        <span>•</span>
                        <span>{src.version}</span>
                      </div>

                      <blockquote
                        style={{
                          margin: 0,
                          padding: "0.75rem 0.95rem",
                          borderLeft: "3px solid #10b981",
                          fontSize: "0.86rem",
                          lineHeight: 1.6,
                          color: "#e2e8f0",
                          background: "rgba(0, 0, 0, 0.25)",
                          borderRadius: "0 8px 8px 0",
                          fontStyle: "italic",
                        }}
                      >
                        "{src.excerpt}"
                      </blockquote>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Bar (Copy full answer, audit assurance) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  onClick={handleCopyAnswer}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.5rem 0.95rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: copiedAnswer ? "#10b981" : "var(--text)",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {copiedAnswer ? <Check size={14} /> : <Copy size={14} />}
                  {copiedAnswer ? "Answer copied to clipboard" : "Copy full guidance"}
                </button>

                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <CornerDownLeft size={12} />
                  Press Esc to dismiss
                </span>
              </div>

              {/* Disclaimer Note */}
              <div
                style={{
                  fontSize: "0.74rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  padding: "0.85rem 1rem",
                  borderRadius: "10px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <strong>Audit Compliance Guarantee:</strong> PRANGARA RAG Intelligence queries strictly verified regulatory repositories (CEA v22, SEBI BRSR Core, EU CBAM 2023/956, IPCC 2006). AI text explanations never alter deterministic computation values or plant baseline ledgers.
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
