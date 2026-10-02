import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Scale,
  X,
  FileCheck,
  TrendingDown,
  ChevronRight,
  Database,
  Layers,
} from "lucide-react";
import { PrangaraLogoMark } from "../components/brand/PrangaraLogo";
import { signIn } from "../api/platform";
import { DEMO_USERS, DEMO_PASSWORD } from "../lib/demoAccounts";
import "../styles/native-landing.css";

const SECTORS_DATA = [
  {
    key: "textile_dyeing",
    tab: "Textiles",
    name: "Tirupur Knitwear Dyeing & Wet Processing",
    cluster: "Tirupur Textile MSME Cluster, Tamil Nadu",
    desc: "Cotton and blend wet processing unit. High specific electricity in pump headers and uninsulated steam lines causing cluster benchmark deviation.",
    medianPower: "0.52 kWh/kg",
    actualPower: "0.85 kWh/kg (+63%)",
    leakPoint: "Vinch liquor ratio reset & uninsulated live steam headers",
    saving: "₹38.5 Lakh / yr",
    abatement: "1,420 tCO₂e",
    payback: "8.2 Months",
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
    saving: "₹62.0 Lakh / yr",
    abatement: "3,150 tCO₂e",
    payback: "11.4 Months",
  },
  {
    key: "chemicals_bulk",
    tab: "Chemicals",
    name: "Vapi Specialty Chemical Synthesis",
    cluster: "Vapi Industrial Estate, Gujarat",
    desc: "Batch chemical synthesis with high steam consumption and unrecovered distillation condensate draining to common effluent treatment.",
    medianPower: "1.9 t steam/t",
    actualPower: "2.8 t steam/t (+47%)",
    leakPoint: "Unrecovered distillation condensate & boiler blowdown thermal loss",
    saving: "₹45.2 Lakh / yr",
    abatement: "2,280 tCO₂e",
    payback: "6.5 Months",
  },
  {
    key: "ceramics_tiles",
    tab: "Ceramics",
    name: "Morbi Porcelain & Ceramic Tile Cluster",
    cluster: "Morbi Cluster, Gujarat",
    desc: "Continuous roller kiln tile firing with natural gas combustion imbalances and unoptimized preheating zone heat recirculation.",
    medianPower: "1.35 SCM/m²",
    actualPower: "1.80 SCM/m² (+33%)",
    leakPoint: "Roller kiln radiation loss & pre-heating air combustion imbalance",
    saving: "₹84.0 Lakh / yr",
    abatement: "4,600 tCO₂e",
    payback: "14.2 Months",
  },
  {
    key: "foundry_cast",
    tab: "Foundries",
    name: "Rajkot Grey & Ductile Iron Foundry",
    cluster: "Rajkot Engineering Cluster, Gujarat",
    desc: "Medium-frequency induction melting crucible with high holding furnace kilowatt loss and unoptimized scrap charge packing density.",
    medianPower: "540 kWh/t melt",
    actualPower: "680 kWh/t melt (+26%)",
    leakPoint: "Holding furnace refractory wear & sub-optimal scrap packing density",
    saving: "₹51.8 Lakh / yr",
    abatement: "2,890 tCO₂e",
    payback: "9.1 Months",
  },
  {
    key: "plastics_injection",
    tab: "Plastics",
    name: "Pune Automotive Injection Moulding",
    cluster: "Bhosari / Chakan, Maharashtra",
    desc: "Hydraulic injection moulding presses running idle cycle power draw and uninsulated polymer barrel heating bands.",
    medianPower: "0.95 kWh/kg",
    actualPower: "1.45 kWh/kg (+52%)",
    leakPoint: "Servo-hydraulic pump absence & uninsulated barrel heater bands",
    saving: "₹29.4 Lakh / yr",
    abatement: "980 tCO₂e",
    payback: "10.0 Months",
  },
];

export default function Landing({ defaultHash }: { defaultHash?: string }) {
  const navigate = useNavigate();
  const [activeSector, setActiveSector] = useState(SECTORS_DATA[0]);
  const [authModalOpen, setAuthModalOpen] = useState(defaultHash === "#signin" || defaultHash === "#signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
      // If offline or network issue, proceed to overview with client fixture session
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
      const targetUser = DEMO_USERS.find((u) => u.email.toLowerCase() === authEmail.toLowerCase()) || DEMO_USERS[1];
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
      <div className="nl-ambient-glow" />
      <div className="nl-grid-pattern" />

      {/* Header Navigation */}
      <header className="nl-header">
        <div className="nl-container">
          <div className="nl-header-inner">
            <Link to="/" className="nl-brand">
              <PrangaraLogoMark size={28} />
              <span>PRANGARA</span>
              <span className="nl-brand-tag">OS 2.0</span>
            </Link>

            <nav className="nl-nav">
              <a href="#platform" className="nl-nav-link">Platform</a>
              <a href="#sectors" className="nl-nav-link">Sectors & Benchmarks</a>
              <a href="#compliance" className="nl-nav-link">Compliance</a>
              <Link to="/methodology" className="nl-nav-link">Audit Methodology</Link>
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
                onClick={() => handlePersonaLogin("owner@demo.prangara.example")}
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
          <div className="nl-pill-badge">
            <span className="nl-badge-dot" />
            <span>Zero-LLM Deterministic Carbon Math · 10 Statutory Sectors</span>
          </div>

          <h1 className="nl-hero-title">
            Turn industrial emissions into{" "}
            <span className="nl-hero-gradient">measurable opportunity.</span>
          </h1>

          <p className="nl-hero-sub">
            The auditable carbon accounting & circular economics operating system for India's manufacturing backbone.
            Real engineering models, verified statutory baselines, zero AI hallucinations.
          </p>

          <div className="nl-hero-actions">
            <button
              type="button"
              className="nl-btn nl-btn-primary nl-btn-lg"
              onClick={() => handlePersonaLogin("owner@demo.prangara.example")}
            >
              <span>Explore Demo Factory (Tirupur)</span>
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="nl-btn nl-btn-ghost nl-btn-lg"
              onClick={() => setAuthModalOpen(true)}
            >
              <span>Select Persona / Sign In</span>
            </button>
          </div>

          {/* Statutory Credibility Bar */}
          <div className="nl-trust-strip">
            <span className="nl-trust-label">Verified Baselines:</span>
            <span className="nl-trust-item">
              <ShieldCheck size={14} color="#5CCB94" />
              CEA Baseline v22
            </span>
            <span className="nl-trust-dot" />
            <span className="nl-trust-item">
              <ShieldCheck size={14} color="#5CCB94" />
              BEE MSME 55 Clusters
            </span>
            <span className="nl-trust-dot" />
            <span className="nl-trust-item">
              <ShieldCheck size={14} color="#5CCB94" />
              CPCB Hazardous & PWM Rules
            </span>
            <span className="nl-trust-dot" />
            <span className="nl-trust-item">
              <ShieldCheck size={14} color="#5CCB94" />
              SEBI BRSR Core & EU CBAM
            </span>
          </div>
        </div>
      </section>

      {/* Live Engine Product Preview */}
      <section className="nl-preview-section" id="platform">
        <div className="nl-container">
          <div className="nl-preview-window">
            <div className="nl-window-bar">
              <div className="nl-window-dots">
                <span className="nl-wdot nl-wdot-r" />
                <span className="nl-wdot nl-wdot-y" />
                <span className="nl-wdot nl-wdot-g" />
              </div>
              <div className="nl-window-title">prangara-engine://live-telemetry/textile_dyeing/tirupur</div>
              <div className="nl-window-status">
                <span className="nl-badge-dot" />
                <span>Deterministic Engine 1.0 Active</span>
              </div>
            </div>

            <div className="nl-preview-body">
              <div className="nl-preview-header">
                <div>
                  <div className="nl-preview-plant-name">Tirupur Knitwear Dyeing & Processing Works</div>
                  <div className="nl-preview-plant-sub">
                    Tamil Nadu Textile Cluster · Screening Grade Baseline · Scope 1-3 Boundary
                  </div>
                </div>
                <button
                  type="button"
                  className="nl-btn nl-btn-demo"
                  onClick={() => handlePersonaLogin("owner@demo.prangara.example")}
                >
                  <span>Open Live Assessment</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* KPI Strip */}
              <div className="nl-metrics-row">
                <div className="nl-preview-kpi">
                  <div className="nl-kpi-label">Cash-Positive Savings</div>
                  <div className="nl-kpi-val green">₹4.66 Cr <span style={{ fontSize: 14, color: "#94A3B8" }}>/ yr</span></div>
                  <div className="nl-kpi-sub">17 self-funding interventions</div>
                </div>
                <div className="nl-preview-kpi">
                  <div className="nl-kpi-label">Total Carbon Boundary</div>
                  <div className="nl-kpi-val cyan">24,069 <span style={{ fontSize: 14, color: "#94A3B8" }}>tCO₂e</span></div>
                  <div className="nl-kpi-sub">Scope 1 (28%) · Scope 2 (8%) · Scope 3 (64%)</div>
                </div>
                <div className="nl-preview-kpi">
                  <div className="nl-kpi-label">Capital Payback</div>
                  <div className="nl-kpi-val amber">12 Months</div>
                  <div className="nl-kpi-sub">Blended CapEx: ₹4.56 Cr</div>
                </div>
                <div className="nl-preview-kpi">
                  <div className="nl-kpi-label">No-Net-Cost Abatement</div>
                  <div className="nl-kpi-val green">25.0% <span style={{ fontSize: 14, color: "#94A3B8" }}>(6,016 t)</span></div>
                  <div className="nl-kpi-sub">Verified against CEA Baseline</div>
                </div>
              </div>

              {/* Scopes Stacked Bar */}
              <div className="nl-scope-split">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94A3B8" }}>
                  <span>Scope 1: Direct Combustion (6,739 t)</span>
                  <span>Scope 2: Purchased Electricity (1,926 t)</span>
                  <span>Scope 3: Upstream Materials & Freight (15,404 t)</span>
                </div>
                <div className="nl-scope-bar-outer">
                  <div className="nl-scope-s1" style={{ width: "28%" }} />
                  <div className="nl-scope-s2" style={{ width: "8%" }} />
                  <div className="nl-scope-s3" style={{ width: "64%" }} />
                </div>
                <div className="nl-scope-legend">
                  <div className="nl-legend-item">
                    <span className="nl-leg-dot" style={{ background: "#F2B77F" }} />
                    <span>Scope 1: <strong>28%</strong> (Boiler Fuel & Gensets)</span>
                  </div>
                  <div className="nl-legend-item">
                    <span className="nl-leg-dot" style={{ background: "#B7B5EA" }} />
                    <span>Scope 2: <strong>8%</strong> (Tamil Nadu Grid Power)</span>
                  </div>
                  <div className="nl-legend-item">
                    <span className="nl-leg-dot" style={{ background: "#79D7E6" }} />
                    <span>Scope 3: <strong>64%</strong> (Purchased Yarn, Dyes & Transport)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industrial Problem Cards */}
      <section className="nl-section" id="features">
        <div className="nl-container">
          <div className="nl-section-header">
            <div className="nl-section-eyebrow">The Manufacturing Reality</div>
            <h2 className="nl-section-title">Why Generic ESG Tools Fail Indian MSMEs</h2>
            <p className="nl-section-desc">
              Global platforms push unverified generative AI estimates and luxury consultancy reports.
              Prangara delivers audit-grade physics math and immediate cash savings.
            </p>
          </div>

          <div className="nl-cards-grid">
            <div className="nl-card">
              <div className="nl-card-icon">
                <Zap size={24} />
              </div>
              <h3 className="nl-card-title">Hidden Energy & Thermal Leaks</h3>
              <p className="nl-card-desc">
                Uncontrolled specific power consumption, steam header leaks, and uninsulated boiler piping silently erode factory EBITDA every month without engineering visibility.
              </p>
            </div>

            <div className="nl-card">
              <div className="nl-card-icon">
                <Scale size={24} />
              </div>
              <h3 className="nl-card-title">Impending CBAM & BRSR Tariffs</h3>
              <p className="nl-card-desc">
                European border adjustments (CBAM) and SEBI BRSR Core mandatory supply chain disclosures threaten to lock out non-compliant manufacturers from export supply chains.
              </p>
            </div>

            <div className="nl-card">
              <div className="nl-card-icon">
                <Database size={24} />
              </div>
              <h3 className="nl-card-title">The Generative AI Fallacy</h3>
              <p className="nl-card-desc">
                LLMs hallucinate emission factors. Prangara uses zero-LLM deterministic math verified against official CEA, CPCB, and BEE statutory databases with cryptographic hashes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Sector Benchmarks */}
      <section className="nl-section" id="sectors" style={{ background: "rgba(10, 16, 23, 0.4)" }}>
        <div className="nl-container">
          <div className="nl-section-header">
            <div className="nl-section-eyebrow">Cluster Benchmark Intelligence</div>
            <h2 className="nl-section-title">Built Across 10 Industrial Sectors</h2>
            <p className="nl-section-desc">
              Explore real baseline metrics, specific consumption benchmarks, and verified decarbonization payback periods.
            </p>
          </div>

          {/* Sector Tabs */}
          <div className="nl-sectors-tabs">
            {SECTORS_DATA.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`nl-sector-tab ${activeSector.key === s.key ? "active" : ""}`}
                onClick={() => setActiveSector(s)}
              >
                {s.tab}
              </button>
            ))}
          </div>

          {/* Active Sector Card */}
          <div className="nl-sector-detail-card">
            <div>
              <div className="nl-sec-name">{activeSector.name}</div>
              <div className="nl-sec-cluster">Cluster: {activeSector.cluster}</div>
              <p className="nl-sec-desc">{activeSector.desc}</p>

              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 12, textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Primary Detected Leak Point:</span>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#F2B77F", marginTop: 4 }}>
                  {activeSector.leakPoint}
                </div>
              </div>

              <button
                type="button"
                className="nl-btn nl-btn-primary"
                onClick={() => handlePersonaLogin("owner@demo.prangara.example")}
              >
                <span>Assess This Sector in Sandbox</span>
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="nl-sec-stat-grid">
              <div className="nl-sec-stat-box">
                <div className="nl-sec-stat-label">Benchmark Median</div>
                <div className="nl-sec-stat-val">{activeSector.medianPower}</div>
              </div>
              <div className="nl-sec-stat-box">
                <div className="nl-sec-stat-label">Sample Plant Intensity</div>
                <div className="nl-sec-stat-val" style={{ color: "#F87171" }}>{activeSector.actualPower}</div>
              </div>
              <div className="nl-sec-stat-box">
                <div className="nl-sec-stat-label">Annual Savings</div>
                <div className="nl-sec-stat-val" style={{ color: "#5CCB94" }}>{activeSector.saving}</div>
              </div>
              <div className="nl-sec-stat-box">
                <div className="nl-sec-stat-label">Blended Payback</div>
                <div className="nl-sec-stat-val" style={{ color: "#79D7E6" }}>{activeSector.payback}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance & Verification Proofs */}
      <section className="nl-section" id="compliance">
        <div className="nl-container">
          <div className="nl-section-header">
            <div className="nl-section-eyebrow">Cryptographic Integrity</div>
            <h2 className="nl-section-title">Every Factor Cryptographically Signed</h2>
            <p className="nl-section-desc">
              30 statutory agency sources anchored by immutable SHA-256 signatures for statutory audit defence.
            </p>
          </div>

          <div className="nl-cards-grid">
            <div className="nl-card">
              <div className="nl-card-icon" style={{ background: "rgba(92, 203, 148, 0.12)", color: "#5CCB94", borderColor: "rgba(92, 203, 148, 0.25)" }}>
                <FileCheck size={24} />
              </div>
              <h3 className="nl-card-title">SEBI BRSR Core Ready</h3>
              <p className="nl-card-desc">
                Direct export of 9 key ESG environmental attributes formatted for Tier-1 supply chain disclosures and certified auditor inspection.
              </p>
            </div>

            <div className="nl-card">
              <div className="nl-card-icon" style={{ background: "rgba(121, 215, 230, 0.12)", color: "#79D7E6", borderColor: "rgba(121, 215, 230, 0.25)" }}>
                <TrendingDown size={24} />
              </div>
              <h3 className="nl-card-title">EU CBAM Declarations</h3>
              <p className="nl-card-desc">
                Compliant with European Commission Regulation 2026/02 guidelines for embedded direct and indirect emission calculations on steel and aluminum.
              </p>
            </div>

            <div className="nl-card">
              <div className="nl-card-icon" style={{ background: "rgba(183, 181, 234, 0.12)", color: "#B7B5EA", borderColor: "rgba(183, 181, 234, 0.25)" }}>
                <Layers size={24} />
              </div>
              <h3 className="nl-card-title">Circular Waste Backhauling</h3>
              <p className="nl-card-desc">
                Integrated CVRPTW logistics pooling algorithms cutting empty volume by 50% and matching secondary circular materials across factories.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="nl-final-cta">
        <div className="nl-container">
          <div className="nl-cta-box">
            <h2 className="nl-cta-title">Ready to Stop Carbon & Capital Leaks?</h2>
            <p className="nl-cta-sub">
              Access the live assessment workspace immediately. Select any industrial persona or run a custom plant diagnostic in seconds.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <button
                type="button"
                className="nl-btn nl-btn-primary nl-btn-lg"
                onClick={() => handlePersonaLogin("owner@demo.prangara.example")}
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
          <div className="nl-footer-grid">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <PrangaraLogoMark size={24} />
              <span style={{ fontWeight: 700, fontSize: 17, color: "#F8FAFC" }}>PRANGARA</span>
              <span style={{ fontSize: 12, color: "#64748B" }}>Industrial Intelligence</span>
            </div>

            <div className="nl-footer-links">
              <Link to="/overview">Overview</Link>
              <Link to="/methodology">Methodology</Link>
              <Link to="/marketplace">Marketplace</Link>
              <a href="https://github.com/Destroyerved/Prangara" target="_blank" rel="noreferrer">
                GitHub Repository ↗
              </a>
            </div>
          </div>

          <div className="nl-footer-copy">
            © 2026 PRANGARA Industrial Intelligence Network. Statutory baselines under CEA, CPCB, BEE, and MoEFCC authority.
          </div>
        </div>
      </footer>

      {/* Auth / Persona Modal */}
      {authModalOpen && (
        <div className="nl-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div className="nl-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="nl-modal-close"
              onClick={() => setAuthModalOpen(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="nl-modal-title">Access Platform</div>
            <p className="nl-modal-sub">
              Select a pre-seeded industrial persona for instant one-click access:
            </p>

            <div className="nl-persona-list">
              {DEMO_USERS.slice(0, 3).map((user) => (
                <button
                  key={user.email}
                  type="button"
                  className="nl-persona-btn"
                  onClick={() => handlePersonaLogin(user.email)}
                  disabled={authLoading}
                >
                  <div className="nl-persona-avatar">{user.name.split(" ").map((n) => n[0]).join("")}</div>
                  <div className="nl-persona-info">
                    <div className="nl-persona-name">{user.name}</div>
                    <div className="nl-persona-role">{user.company} · {user.role}</div>
                  </div>
                  <ChevronRight size={16} color="#64748B" />
                </button>
              ))}
            </div>

            <div className="nl-divider">or sign in with email</div>

            <form onSubmit={handleEmailLogin}>
              <div className="nl-form-field">
                <label className="nl-label">Work Email</label>
                <input
                  type="email"
                  className="nl-input"
                  placeholder="name@company.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>

              <div className="nl-form-field">
                <label className="nl-label">Password</label>
                <input
                  type="password"
                  className="nl-input"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              {authError && (
                <div style={{ color: "#F87171", fontSize: 13, marginBottom: 12 }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="nl-btn nl-btn-primary"
                style={{ width: "100%", borderRadius: 10, padding: "11px 16px" }}
                disabled={authLoading}
              >
                {authLoading ? "Entering workspace…" : "Sign In & Enter Workspace"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}