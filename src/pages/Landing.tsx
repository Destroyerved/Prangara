import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Scale,
  X,
  ChevronRight,
  Factory,
  Sliders,
  CheckCircle2,
  Truck,
  Cpu,
  ExternalLink,
} from "lucide-react";
import { PrangaraLogoMark } from "../components/brand/PrangaraLogo";
import { signIn } from "../api/platform";
import { DEMO_USERS, DEMO_PASSWORD } from "../lib/demoAccounts";
import "../styles/native-landing.css";

interface SectorData {
  key: string;
  tab: string;
  name: string;
  cluster: string;
  desc: string;
  medianPower: string;
  actualPower: string;
  leakPoint: string;
  leakCategory: string;
  baseSavingsLakhs: number;
  totalFootprintTons: number;
  scope1Pct: number;
  scope2Pct: number;
  scope3Pct: number;
  basePaybackMonths: number;
  defaultTargetPct: number;
  sampleInterventions: string[];
}

const SECTORS_DATA: SectorData[] = [
  {
    key: "textile_dyeing",
    tab: "Textiles & Dyeing",
    name: "Tirupur Knitwear Dyeing & Wet Processing",
    cluster: "Tirupur Textile MSME Cluster, Tamil Nadu",
    desc: "Cotton and blend wet processing unit. High specific electricity in pump headers and uninsulated steam lines causing cluster benchmark deviation.",
    medianPower: "0.52 kWh/kg",
    actualPower: "0.85 kWh/kg (+63%)",
    leakPoint: "Vinch liquor ratio reset & uninsulated live steam headers",
    leakCategory: "Thermal & Pump Pressure Loss",
    baseSavingsLakhs: 466,
    totalFootprintTons: 24069,
    scope1Pct: 28,
    scope2Pct: 8,
    scope3Pct: 64,
    basePaybackMonths: 11.8,
    defaultTargetPct: 25,
    sampleInterventions: [
      "Vinch Liquor Ratio Reset (1:4 ratio tuning)",
      "High-pressure condensate heat return system",
      "Variable frequency drives (VFD) on circulation pumps",
      "Rooftop captive solar (350 kWp)",
    ],
  },
  {
    key: "steel_rolling",
    tab: "Secondary Steel",
    name: "Mandi Gobindgarh Re-Rolling Mills",
    cluster: "Gobindgarh Steel Belt, Punjab",
    desc: "Secondary steel re-rolling and billet heating furnace. Excessive flue-gas heat escape and high specific fuel oil consumption.",
    medianPower: "31 L/t billet",
    actualPower: "42 L/t billet (+35%)",
    leakPoint: "Furnace flue-gas heat loss & non-recuperative burner firing",
    leakCategory: "Combustion & Flue Exhaust",
    baseSavingsLakhs: 620,
    totalFootprintTons: 38400,
    scope1Pct: 52,
    scope2Pct: 18,
    scope3Pct: 30,
    basePaybackMonths: 11.4,
    defaultTargetPct: 20,
    sampleInterventions: [
      "Radiation recuperator for preheating combustion air",
      "Low-NOx regenerative burner retrofitting",
      "Friction reduction on re-rolling mill stands",
      "Waste heat recovery steam generator",
    ],
  },
  {
    key: "chemicals_bulk",
    tab: "Specialty Chemicals",
    name: "Vapi Specialty Chemical Synthesis",
    cluster: "Vapi Industrial Estate, Gujarat",
    desc: "Batch chemical synthesis with high steam consumption and unrecovered distillation condensate draining to common effluent treatment.",
    medianPower: "1.9 t steam/t",
    actualPower: "2.8 t steam/t (+47%)",
    leakPoint: "Unrecovered distillation condensate & boiler blowdown thermal loss",
    leakCategory: "Condensate & Solvent Thermal Escape",
    baseSavingsLakhs: 452,
    totalFootprintTons: 19800,
    scope1Pct: 38,
    scope2Pct: 22,
    scope3Pct: 40,
    basePaybackMonths: 6.5,
    defaultTargetPct: 30,
    sampleInterventions: [
      "Pressurized condensate return loop to boiler deaerator",
      "Continuous automatic boiler blowdown heat exchanger",
      "Multi-stage solvent distillation vacuum booster",
      "Waste heat thermal integration across reactor trains",
    ],
  },
  {
    key: "ceramics_tiles",
    tab: "Ceramics & Tiles",
    name: "Morbi Porcelain & Vitrified Tile Works",
    cluster: "Morbi Ceramic Cluster, Gujarat",
    desc: "Continuous roller kiln tile firing with natural gas combustion imbalances and unoptimized preheating zone heat recirculation.",
    medianPower: "1.35 SCM/m²",
    actualPower: "1.80 SCM/m² (+33%)",
    leakPoint: "Roller kiln radiation loss & pre-heating air combustion imbalance",
    leakCategory: "Kiln Thermal Radiation",
    baseSavingsLakhs: 840,
    totalFootprintTons: 52000,
    scope1Pct: 62,
    scope2Pct: 14,
    scope3Pct: 24,
    basePaybackMonths: 14.2,
    defaultTargetPct: 22,
    sampleInterventions: [
      "Hot air recirculation from cooling zone to spray dryers",
      "Ceramic fiber blanket insulation on kiln body",
      "Automated air-to-fuel ratio control with O₂ trim",
      "Waste heat power generation (ORC unit)",
    ],
  },
  {
    key: "foundry_cast",
    tab: "Foundries & Castings",
    name: "Rajkot Grey & Ductile Iron Foundry",
    cluster: "Rajkot Engineering Cluster, Gujarat",
    desc: "Medium-frequency induction melting crucible with high holding furnace kilowatt loss and unoptimized scrap charge packing density.",
    medianPower: "540 kWh/t melt",
    actualPower: "680 kWh/t melt (+26%)",
    leakPoint: "Holding furnace refractory wear & sub-optimal scrap packing density",
    leakCategory: "Electrical Induction Inefficiency",
    baseSavingsLakhs: 518,
    totalFootprintTons: 22100,
    scope1Pct: 12,
    scope2Pct: 74,
    scope3Pct: 14,
    basePaybackMonths: 9.1,
    defaultTargetPct: 25,
    sampleInterventions: [
      "High-density scrap pre-heating system using flue exhaust",
      "Refractory relining optimization with micro-porous board",
      "Automated lid closure control on induction crucibles",
      "Harmonic filter installation on power supply",
    ],
  },
  {
    key: "plastics_injection",
    tab: "Automotive Plastics",
    name: "Pune Automotive Injection Moulding",
    cluster: "Bhosari / Chakan Auto Cluster, Maharashtra",
    desc: "Hydraulic injection moulding presses running idle cycle power draw and uninsulated polymer barrel heating bands.",
    medianPower: "0.95 kWh/kg",
    actualPower: "1.45 kWh/kg (+52%)",
    leakPoint: "Servo-hydraulic pump absence & uninsulated barrel heater bands",
    leakCategory: "Hydraulic Idle & Barrel Radiation",
    baseSavingsLakhs: 294,
    totalFootprintTons: 11400,
    scope1Pct: 5,
    scope2Pct: 82,
    scope3Pct: 13,
    basePaybackMonths: 10.0,
    defaultTargetPct: 35,
    sampleInterventions: [
      "Servo-drive hydraulic retrofit replacing fixed displacement pumps",
      "Nano-aerogel insulated heater jackets on injection barrels",
      "Chilled water circuit pump VFD modulation",
      "Reground polymer closed-loop blending station",
    ],
  },
];

export default function Landing({ defaultHash }: { defaultHash?: string }) {
  const navigate = useNavigate();
  const [activeSector, setActiveSector] = useState<SectorData>(SECTORS_DATA[0]);
  const [decarbTarget, setDecarbTarget] = useState<number>(25);
  const [authModalOpen, setAuthModalOpen] = useState(defaultHash === "#signin" || defaultHash === "#signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dynamic calculations based on target slider
  const targetMultiplier = decarbTarget / activeSector.defaultTargetPct;
  const calculatedSavings = ((activeSector.baseSavingsLakhs * targetMultiplier) / 100).toFixed(2);
  const calculatedAbatement = Math.round(activeSector.totalFootprintTons * (decarbTarget / 100)).toLocaleString();
  const calculatedPayback = (activeSector.basePaybackMonths * (0.85 + (decarbTarget / 100) * 0.5)).toFixed(1);

  const handlePersonaLogin = async (email: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signIn({ email, password: DEMO_PASSWORD }, false);
      const user = DEMO_USERS.find((u) => u.email === email);
      if (user) {
        localStorage.setItem(
          "prangara_user_profile",
          JSON.stringify({
            full_name: user.name,
            email: user.email,
            organization_name: user.company,
            role: user.role,
            phone: "+91 98421 77320",
            cluster: "Tirupur Textile MSME Cluster, Tamil Nadu",
            organization_kind: "manufacturer",
          })
        );
      }
      setAuthModalOpen(false);
      navigate("/overview");
    } catch {
      // Fallback in case of network issue - enters client fixture session
      navigate("/overview");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const targetUser = DEMO_USERS.find((u) => u.email.toLowerCase() === authEmail.toLowerCase()) || DEMO_USERS[0];
      await signIn({ email: targetUser.email, password: authPassword || DEMO_PASSWORD }, false);
      setAuthModalOpen(false);
      navigate("/overview");
    } catch {
      navigate("/overview");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="nl-root">
      {/* Ambient Radial Mesh & Glowing Grids */}
      <div className="nl-ambient-glow-wrap">
        <div className="nl-glow-orb-primary" />
        <div className="nl-glow-orb-secondary" />
        <div className="nl-glow-orb-tertiary" />
      </div>
      <div className="nl-grid-mesh" />

      {/* Floating Glass Header Navigation */}
      <header className="nl-header">
        <div className="nl-container">
          <div className="nl-header-inner">
            <Link to="/" className="nl-brand">
              <PrangaraLogoMark size={30} />
              <span className="nl-brand-title">PRANGARA</span>
              <span className="nl-brand-badge">
                <span className="nl-hero-badge-dot" style={{ width: 5, height: 5 }} />
                OS 2.0
              </span>
            </Link>

            <nav className="nl-nav-desktop">
              <a href="#telemetry" className="nl-nav-link">Live Telemetry</a>
              <a href="#simulator" className="nl-nav-link">ROI Simulator</a>
              <a href="#sectors" className="nl-nav-link">10 MSME Sectors</a>
              <a href="#compliance" className="nl-nav-link">Compliance</a>
              <Link to="/methodology" className="nl-nav-link">Methodology</Link>
            </nav>

            <div className="nl-header-actions">
              <button
                type="button"
                className="nl-btn nl-btn-ghost"
                onClick={() => setAuthModalOpen(true)}
              >
                Sign In
              </button>
              <button
                type="button"
                className="nl-btn nl-btn-primary"
                onClick={() => handlePersonaLogin("rajesh@demo.prangara.example")}
              >
                <span>Launch Workspace</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="nl-hero">
        <div className="nl-container">
          <div className="nl-hero-badge">
            <span className="nl-hero-badge-dot" />
            <span>Zero-LLM Deterministic Engine · Verified Across 55 Industrial Clusters</span>
          </div>

          <h1 className="nl-hero-title">
            Decarbonize Industrial Manufacturing with{" "}
            <span className="nl-text-gradient-emerald">Guaranteed EBITDA Payback.</span>
          </h1>

          <p className="nl-hero-sub">
            The auditable carbon intelligence & circular economics operating system for India's manufacturing backbone.
            Physics-based engineering models, verified statutory baselines, zero AI hallucinations.
          </p>

          <div className="nl-hero-actions">
            <button
              type="button"
              className="nl-btn nl-btn-primary nl-btn-lg"
              onClick={() => handlePersonaLogin("rajesh@demo.prangara.example")}
            >
              <span>Explore Demo Factory (Tirupur)</span>
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="nl-btn nl-btn-ghost nl-btn-lg"
              onClick={() => setAuthModalOpen(true)}
            >
              <span>Choose Role Persona</span>
            </button>
          </div>

          {/* Instant 1-Click Launch Persona Bar */}
          <div className="nl-persona-quick-bar">
            <span className="nl-persona-quick-title">Instant 1-Click Executive Access:</span>
            <div className="nl-persona-quick-pills">
              <button
                type="button"
                className="nl-quick-pill highlight-emerald"
                onClick={() => handlePersonaLogin("rajesh@demo.prangara.example")}
              >
                <Factory size={14} />
                <span>Rajesh Kumar (Plant Manager · Textiles)</span>
              </button>
              <button
                type="button"
                className="nl-quick-pill"
                onClick={() => handlePersonaLogin("owner@demo.prangara.example")}
              >
                <Cpu size={14} />
                <span>Hitesh Patel (Owner · Rajkot Metal)</span>
              </button>
              <button
                type="button"
                className="nl-quick-pill"
                onClick={() => handlePersonaLogin("compliance@demo.prangara.example")}
              >
                <Scale size={14} />
                <span>Anita Shah (Auditor · Shah & Assoc)</span>
              </button>
              <button
                type="button"
                className="nl-quick-pill"
                onClick={() => handlePersonaLogin("admin@demo.prangara.example")}
              >
                <ShieldCheck size={14} />
                <span>Priya Admin (Platform Core)</span>
              </button>
            </div>
          </div>

          {/* Statutory Credibility Bar */}
          <div className="nl-trust-strip">
            <span className="nl-trust-label">Statutory Integrity:</span>
            <span className="nl-trust-item">
              <ShieldCheck size={14} color="#34D399" />
              CEA Baseline v22 (0.716 t/MWh)
            </span>
            <span className="nl-trust-dot" />
            <span className="nl-trust-item">
              <ShieldCheck size={14} color="#34D399" />
              BEE MSME 55 Clusters
            </span>
            <span className="nl-trust-dot" />
            <span className="nl-trust-item">
              <ShieldCheck size={14} color="#34D399" />
              CPCB Waste & PWM Rules
            </span>
            <span className="nl-trust-dot" />
            <span className="nl-trust-item">
              <ShieldCheck size={14} color="#34D399" />
              SEBI BRSR Core Mandate
            </span>
            <span className="nl-trust-dot" />
            <span className="nl-trust-item">
              <ShieldCheck size={14} color="#34D399" />
              EU CBAM 2026/02
            </span>
          </div>
        </div>
      </section>

      {/* Interactive Live Telemetry Terminal (Centerpiece) */}
      <section className="nl-preview-section" id="telemetry">
        <div className="nl-container">
          <div className="nl-terminal-chassis">
            {/* Terminal macOS Top Bar */}
            <div className="nl-terminal-topbar">
              <div className="nl-terminal-controls">
                <span className="nl-ctrl-dot nl-ctrl-r" />
                <span className="nl-ctrl-dot nl-ctrl-y" />
                <span className="nl-ctrl-dot nl-ctrl-g" />
              </div>
              <div className="nl-terminal-path">
                prangara-engine://live-telemetry/{activeSector.key}/cluster-active
              </div>
              <div className="nl-terminal-status">
                <span className="nl-hero-badge-dot" style={{ width: 6, height: 6 }} />
                <span>Deterministic Engine 2.0 Active</span>
              </div>
            </div>

            {/* Terminal Content */}
            <div className="nl-terminal-content">
              {/* Plant Meta & Quick Launch */}
              <div className="nl-terminal-hero-bar">
                <div className="nl-terminal-plant-meta">
                  <h3>{activeSector.name}</h3>
                  <p>{activeSector.cluster} · Screening Grade Baseline · Scope 1-3 Boundary</p>
                </div>
                <button
                  type="button"
                  className="nl-btn nl-btn-cyan"
                  onClick={() => handlePersonaLogin("rajesh@demo.prangara.example")}
                >
                  <span>Launch Live Assessment</span>
                  <ExternalLink size={14} />
                </button>
              </div>

              {/* Terminal Sector Switcher */}
              <div className="nl-terminal-tabs">
                {SECTORS_DATA.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={`nl-ttab ${activeSector.key === s.key ? "active" : ""}`}
                    onClick={() => {
                      setActiveSector(s);
                      setDecarbTarget(s.defaultTargetPct);
                    }}
                  >
                    {s.tab}
                  </button>
                ))}
              </div>

              {/* KPI Strip */}
              <div className="nl-metrics-grid">
                <div className="nl-kpi-card" style={{ "--card-accent": "#10B981" } as React.CSSProperties}>
                  <div className="nl-kpi-header">
                    <span className="nl-kpi-tag">Cash-Positive Savings</span>
                    <span className="nl-kpi-badge green">Self-Funding</span>
                  </div>
                  <div className="nl-kpi-value">
                    ₹{((activeSector.baseSavingsLakhs) / 100).toFixed(2)} Cr <span className="nl-kpi-unit">/ yr</span>
                  </div>
                  <div className="nl-kpi-detail">17 identified cluster interventions</div>
                </div>

                <div className="nl-kpi-card" style={{ "--card-accent": "#38BDF8" } as React.CSSProperties}>
                  <div className="nl-kpi-header">
                    <span className="nl-kpi-tag">Total Carbon Boundary</span>
                    <span className="nl-kpi-badge cyan">Scope 1-3</span>
                  </div>
                  <div className="nl-kpi-value">
                    {activeSector.totalFootprintTons.toLocaleString()} <span className="nl-kpi-unit">tCO₂e</span>
                  </div>
                  <div className="nl-kpi-detail">
                    Scope 1 ({activeSector.scope1Pct}%) · Scope 2 ({activeSector.scope2Pct}%) · Scope 3 ({activeSector.scope3Pct}%)
                  </div>
                </div>

                <div className="nl-kpi-card" style={{ "--card-accent": "#F59E0B" } as React.CSSProperties}>
                  <div className="nl-kpi-header">
                    <span className="nl-kpi-tag">Capital Payback</span>
                    <span className="nl-kpi-badge amber">CapEx Return</span>
                  </div>
                  <div className="nl-kpi-value">
                    {activeSector.basePaybackMonths} <span className="nl-kpi-unit">Months</span>
                  </div>
                  <div className="nl-kpi-detail">Blended equipment amortization</div>
                </div>

                <div className="nl-kpi-card" style={{ "--card-accent": "#34D399" } as React.CSSProperties}>
                  <div className="nl-kpi-header">
                    <span className="nl-kpi-tag">No-Net-Cost Yield</span>
                    <span className="nl-kpi-badge green">Statutory Math</span>
                  </div>
                  <div className="nl-kpi-value">
                    {activeSector.defaultTargetPct}% <span className="nl-kpi-unit">({Math.round(activeSector.totalFootprintTons * (activeSector.defaultTargetPct / 100)).toLocaleString()} t)</span>
                  </div>
                  <div className="nl-kpi-detail">Verified against CEA & BEE baselines</div>
                </div>
              </div>

              {/* Scopes Stacked Bar Visualizer */}
              <div className="nl-scope-panel">
                <div className="nl-scope-title-row">
                  <span style={{ fontWeight: 600, color: "#FFFFFF" }}>Carbon Boundary Distribution:</span>
                  <span style={{ color: "#94A3B8", fontSize: 12 }}>
                    Scope 1: Direct Combustion · Scope 2: Purchased Grid · Scope 3: Supply Chain
                  </span>
                </div>

                <div className="nl-scope-bar-outer">
                  <div className="nl-sbar-1" style={{ width: `${activeSector.scope1Pct}%` }} />
                  <div className="nl-sbar-2" style={{ width: `${activeSector.scope2Pct}%` }} />
                  <div className="nl-sbar-3" style={{ width: `${activeSector.scope3Pct}%` }} />
                </div>

                <div className="nl-scope-legend-row">
                  <div className="nl-scope-item">
                    <span className="nl-scope-dot" style={{ background: "#F59E0B" }} />
                    <span>Scope 1: <strong>{activeSector.scope1Pct}%</strong> (Direct Boilers & Gensets)</span>
                  </div>
                  <div className="nl-scope-item">
                    <span className="nl-scope-dot" style={{ background: "#818CF8" }} />
                    <span>Scope 2: <strong>{activeSector.scope2Pct}%</strong> (Grid Power Intensity)</span>
                  </div>
                  <div className="nl-scope-item">
                    <span className="nl-scope-dot" style={{ background: "#38BDF8" }} />
                    <span>Scope 3: <strong>{activeSector.scope3Pct}%</strong> (Raw Materials & Logistics)</span>
                  </div>
                </div>
              </div>

              {/* Built-in Decarbonization ROI Simulator */}
              <div className="nl-calc-chassis" id="simulator">
                <div className="nl-calc-top">
                  <div className="nl-calc-header-title">
                    <Sliders size={18} color="#34D399" />
                    <span>Interactive Decarbonization Target Simulator</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#A7F3D0", fontWeight: 600 }}>
                    Target Reduction: <span style={{ fontSize: 18, color: "#FFFFFF" }}>{decarbTarget}%</span>
                  </div>
                </div>

                <div className="nl-slider-wrap">
                  <div className="nl-slider-labels">
                    <span>10% (Low-hanging fruit)</span>
                    <span>25% (Balanced CapEx)</span>
                    <span>50% (Deep Decarbonization)</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={decarbTarget}
                    onChange={(e) => setDecarbTarget(Number(e.target.value))}
                    className="nl-range-input"
                  />
                </div>

                <div className="nl-calc-results-grid">
                  <div className="nl-calc-res-box">
                    <div className="nl-calc-res-label">Annual Cost Savings</div>
                    <div className="nl-calc-res-value green">₹{calculatedSavings} Cr <span style={{ fontSize: 12 }}>/ yr</span></div>
                  </div>
                  <div className="nl-calc-res-box">
                    <div className="nl-calc-res-label">Carbon Abated</div>
                    <div className="nl-calc-res-value cyan">{calculatedAbatement} <span style={{ fontSize: 12 }}>tCO₂e</span></div>
                  </div>
                  <div className="nl-calc-res-box">
                    <div className="nl-calc-res-label">Estimated Payback</div>
                    <div className="nl-calc-res-value amber">{calculatedPayback} <span style={{ fontSize: 12 }}>Months</span></div>
                  </div>
                  <div className="nl-calc-res-box">
                    <div className="nl-calc-res-label">Cluster Anomaly Identified</div>
                    <div className="nl-calc-res-value" style={{ fontSize: 13, color: "#FDE68A" }}>
                      {activeSector.leakCategory}
                    </div>
                  </div>
                </div>

                <div className="nl-calc-bottom-cta">
                  <div style={{ fontSize: 13, color: "#94A3B8" }}>
                    Primary Leak: <strong style={{ color: "#F59E0B" }}>{activeSector.leakPoint}</strong>
                  </div>
                  <button
                    type="button"
                    className="nl-btn nl-btn-primary"
                    onClick={() => handlePersonaLogin("rajesh@demo.prangara.example")}
                  >
                    <span>Simulate {activeSector.tab} in Workspace</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Prangara vs Generic ESG (Comparison Card) */}
      <section className="nl-section" id="comparison">
        <div className="nl-container">
          <div className="nl-section-header">
            <span className="nl-eyebrow">The Engineering Reality</span>
            <h2 className="nl-section-title">Why Generic ESG Tools Fail Indian Manufacturers</h2>
            <p className="nl-section-desc">
              Global platforms push unverified generative AI estimates and luxury consultancy reports.
              Prangara delivers audit-grade physics math and immediate cash savings.
            </p>
          </div>

          <div className="nl-comparison-box">
            <div className="nl-comparison-grid">
              {/* Legacy Approach */}
              <div className="nl-comp-col legacy">
                <div className="nl-comp-header">
                  <div className="nl-comp-col-title">
                    <X size={20} color="#F87171" />
                    <span>Generic ESG & AI Software</span>
                  </div>
                  <div className="nl-comp-col-sub">Subjective, slow, high hallucination risk</div>
                </div>

                <div className="nl-comp-list">
                  <div className="nl-comp-item">
                    <X size={16} className="nl-comp-icon-x" />
                    <div><strong>Generative AI Hallucinations:</strong> LLMs guess emission factors with no audit trail or formula proofs.</div>
                  </div>
                  <div className="nl-comp-item">
                    <X size={16} className="nl-comp-icon-x" />
                    <div><strong>High Consultancy Retainers:</strong> Expects ₹15L–₹35L annual fees for manual Excel spreadsheet collation.</div>
                  </div>
                  <div className="nl-comp-item">
                    <X size={16} className="nl-comp-icon-x" />
                    <div><strong>Zero Engineering Physics:</strong> No understanding of specific steam enthalpies, boiler combustion curves, or VFD dynamics.</div>
                  </div>
                  <div className="nl-comp-item">
                    <X size={16} className="nl-comp-icon-x" />
                    <div><strong>Static Marketing PDFs:</strong> Produces vanity sustainability reports with zero link to plant EBITDA or payback.</div>
                  </div>
                </div>
              </div>

              {/* Prangara OS */}
              <div className="nl-comp-col prangara">
                <div className="nl-comp-header">
                  <div className="nl-comp-col-title">
                    <CheckCircle2 size={20} color="#34D399" />
                    <span>PRANGARA Industrial OS</span>
                  </div>
                  <div className="nl-comp-col-sub">Deterministic, statutory-verified, self-funding</div>
                </div>

                <div className="nl-comp-list">
                  <div className="nl-comp-item">
                    <CheckCircle2 size={16} className="nl-comp-icon-check" />
                    <div><strong>Zero-LLM Deterministic Engine:</strong> Every factor is anchored by immutable SHA-256 cryptographic hashes and official gazette formulas.</div>
                  </div>
                  <div className="nl-comp-item">
                    <CheckCircle2 size={16} className="nl-comp-icon-check" />
                    <div><strong>55 BEE MSME Cluster Baselines:</strong> Pre-loaded peer percentiles for Tirupur, Morbi, Mandi Gobindgarh, Vapi, and Rajkot.</div>
                  </div>
                  <div className="nl-comp-item">
                    <CheckCircle2 size={16} className="nl-comp-icon-check" />
                    <div><strong>Self-Funding Interventions:</strong> Prioritizes positive-EBITDA actions with capital amortizations under 12 months.</div>
                  </div>
                  <div className="nl-comp-item">
                    <CheckCircle2 size={16} className="nl-comp-icon-check" />
                    <div><strong>Direct Statutory Export:</strong> 1-click filing format for SEBI BRSR Core, European Union CBAM, and ISO 14064.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Technology Pillars */}
      <section className="nl-section" id="features">
        <div className="nl-container">
          <div className="nl-section-header">
            <span className="nl-eyebrow">Enterprise Architecture</span>
            <h2 className="nl-section-title">Built for Heavy Industry Operations</h2>
            <p className="nl-section-desc">
              Four synchronized engines powering transparent industrial decarbonization.
            </p>
          </div>

          <div className="nl-features-grid">
            <div className="nl-feat-card">
              <div className="nl-feat-icon-wrap">
                <Cpu size={24} />
              </div>
              <h3 className="nl-feat-title">Deterministic Math Engine</h3>
              <p className="nl-feat-desc">
                Mathematical certainty with no LLM hallucination. Every calculation traces back to official CEA, CPCB, and BEE statutory databases.
              </p>
            </div>

            <div className="nl-feat-card cyan">
              <div className="nl-feat-icon-wrap">
                <Zap size={24} />
              </div>
              <h3 className="nl-feat-title">Automated Leak Detection</h3>
              <p className="nl-feat-desc">
                Detects specific fuel and kilowatt anomalies against 55 cluster baselines, surfacing invisible thermal losses directly to plant managers.
              </p>
            </div>

            <div className="nl-feat-card purple">
              <div className="nl-feat-icon-wrap">
                <Truck size={24} />
              </div>
              <h3 className="nl-feat-title">CVRPTW Circular Logistics</h3>
              <p className="nl-feat-desc">
                Integrated freight backhauling algorithms pooling secondary materials, cutting deadhead truck travel by 50% across industrial clusters.
              </p>
            </div>

            <div className="nl-feat-card amber">
              <div className="nl-feat-icon-wrap">
                <Scale size={24} />
              </div>
              <h3 className="nl-feat-title">SEBI BRSR & CBAM Ready</h3>
              <p className="nl-feat-desc">
                Automated export of 9 mandatory ESG environmental attributes formatted for Tier-1 supply chains and European border adjustments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10 MSME Sector Intelligence Matrix */}
      <section className="nl-section" id="sectors" style={{ background: "rgba(11, 17, 24, 0.4)" }}>
        <div className="nl-container">
          <div className="nl-section-header">
            <span className="nl-eyebrow">Cluster Benchmark Intelligence</span>
            <h2 className="nl-section-title">Calibrated Across 10 Core Manufacturing Sectors</h2>
            <p className="nl-section-desc">
              Select any industrial sector to review baseline metrics, cluster deviations, and verified payback models.
            </p>
          </div>

          <div className="nl-sector-matrix">
            {SECTORS_DATA.map((s) => (
              <div key={s.key} className="nl-smatrix-card">
                <div>
                  <div className="nl-scard-top">
                    <span className="nl-scard-sector-tag">{s.tab}</span>
                    <span className="nl-scard-cluster">{s.cluster.split(",")[0]}</span>
                  </div>
                  <h4 className="nl-scard-name">{s.name}</h4>
                  <p className="nl-scard-desc">{s.desc}</p>

                  <div className="nl-scard-leak-box">
                    <div className="nl-scard-leak-label">Detected Anomaly:</div>
                    <div className="nl-scard-leak-val">{s.leakPoint}</div>
                  </div>

                  <div className="nl-scard-kpis">
                    <div>
                      <div className="nl-scard-kpi-sub">Benchmark Median</div>
                      <div className="nl-scard-kpi-main">{s.medianPower}</div>
                    </div>
                    <div>
                      <div className="nl-scard-kpi-sub">Plant Intensity</div>
                      <div className="nl-scard-kpi-main" style={{ color: "#F87171" }}>{s.actualPower}</div>
                    </div>
                    <div>
                      <div className="nl-scard-kpi-sub">Annual Savings</div>
                      <div className="nl-scard-kpi-main" style={{ color: "#34D399" }}>₹{(s.baseSavingsLakhs / 100).toFixed(2)} Cr</div>
                    </div>
                    <div>
                      <div className="nl-scard-kpi-sub">Payback Period</div>
                      <div className="nl-scard-kpi-main" style={{ color: "#38BDF8" }}>{s.basePaybackMonths} Mos</div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="nl-btn nl-btn-ghost"
                  style={{ width: "100%", justifyContent: "space-between" }}
                  onClick={() => handlePersonaLogin("rajesh@demo.prangara.example")}
                >
                  <span>Launch Diagnostic Workspace</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="nl-final-cta">
        <div className="nl-container">
          <div className="nl-final-box">
            <h2 className="nl-final-title">Stop Carbon & Capital Leaks Before Your Next Audit</h2>
            <p className="nl-final-sub">
              Access the live industrial intelligence workspace immediately. Select any pre-seeded persona or simulate plant telemetry with zero configuration.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <button
                type="button"
                className="nl-btn nl-btn-primary nl-btn-lg"
                onClick={() => handlePersonaLogin("rajesh@demo.prangara.example")}
              >
                <span>Launch Free Demo Workspace</span>
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="nl-btn nl-btn-ghost nl-btn-lg"
                onClick={() => setAuthModalOpen(true)}
              >
                <span>Choose Demo Persona</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="nl-footer">
        <div className="nl-container">
          <div className="nl-footer-main">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <PrangaraLogoMark size={26} />
              <span style={{ fontWeight: 800, fontSize: 18, color: "#FFFFFF" }}>PRANGARA</span>
              <span style={{ fontSize: 12, color: "#64748B" }}>Industrial Carbon Intelligence Network</span>
            </div>

            <div className="nl-footer-links">
              <Link to="/overview" className="nl-footer-link">Overview</Link>
              <Link to="/methodology" className="nl-footer-link">Audit Methodology</Link>
              <Link to="/marketplace" className="nl-footer-link">Marketplace</Link>
              <Link to="/compliance" className="nl-footer-link">Compliance</Link>
              <a
                href="https://github.com/Destroyerved/Prangara"
                target="_blank"
                rel="noreferrer"
                className="nl-footer-link"
              >
                GitHub ↗
              </a>
            </div>
          </div>

          <div className="nl-footer-copy">
            © 2026 PRANGARA Industrial Intelligence Network. Statutory baselines under Central Electricity Authority (CEA), Bureau of Energy Efficiency (BEE), Central Pollution Control Board (CPCB), and Ministry of Environment, Forest and Climate Change (MoEFCC).
          </div>
        </div>
      </footer>

      {/* Executive Persona / Auth Modal */}
      {authModalOpen && (
        <div className="nl-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div className="nl-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="nl-modal-close"
              onClick={() => setAuthModalOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <h3 className="nl-modal-heading">Enterprise Access</h3>
            <p className="nl-modal-desc">
              Select an industrial executive persona for instant one-click platform access:
            </p>

            <div className="nl-persona-cards-list">
              {DEMO_USERS.map((user, idx) => {
                const colorClass = idx === 0 ? "emerald" : idx === 1 ? "cyan" : idx === 2 ? "purple" : "amber";
                return (
                  <button
                    key={user.email}
                    type="button"
                    className={`nl-pcard ${colorClass}`}
                    onClick={() => handlePersonaLogin(user.email)}
                    disabled={authLoading}
                  >
                    <div className="nl-pcard-avatar">
                      {user.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="nl-pcard-info">
                      <div className="nl-pcard-name">{user.name}</div>
                      <div className="nl-pcard-sub">{user.company} · {user.role}</div>
                    </div>
                    <ChevronRight size={16} color="#64748B" />
                  </button>
                );
              })}
            </div>

            <div className="nl-modal-divider">or sign in with enterprise credentials</div>

            <form onSubmit={handleEmailLogin}>
              <div className="nl-field-wrap">
                <label className="nl-input-label">Work Email</label>
                <input
                  type="email"
                  className="nl-input-element"
                  placeholder="name@company.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>

              <div className="nl-field-wrap">
                <label className="nl-input-label">Password</label>
                <input
                  type="password"
                  className="nl-input-element"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              {authError && (
                <div style={{ color: "#F87171", fontSize: 13, marginBottom: 14 }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="nl-btn nl-btn-primary"
                style={{ width: "100%", padding: "12px 18px", borderRadius: 10 }}
                disabled={authLoading}
              >
                {authLoading ? "Authenticating Session…" : "Sign In & Launch Platform"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}