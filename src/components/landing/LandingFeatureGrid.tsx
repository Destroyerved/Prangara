import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  FileCheck2,
  Globe2,
  Layers,
  Network,
  RotateCcw,
  Sliders,
  Truck,
} from "lucide-react";

interface FeatureCardProps {
  route: string;
  title: string;
  desc: string;
  icon: typeof Activity;
  badge: string;
  highlightColor: string;
}

const MODULES: FeatureCardProps[] = [
  {
    route: "/assessment",
    title: "Plant Data & BOM Intake",
    desc: "Ingest fuel invoices, utility bills, raw material BOMs, and sub-meter logs with automated Tier-1/2/3 data quality scoring.",
    icon: Building2,
    badge: "Input Gate",
    highlightColor: "#fb923c",
  },
  {
    route: "/footprint",
    title: "Gross Footprint & Scopes",
    desc: "Calculate Scope 1, 2, and 3 emissions adhering to GHG Protocol Corporate Standard with uncertainty confidence intervals.",
    icon: Activity,
    badge: "Core Engine",
    highlightColor: "#38bdf8",
  },
  {
    route: "/leaks",
    title: "Leak Points & Root Cause",
    desc: "Rule-based automated anomaly detection comparing factory energy intensity against BEE industrial cluster study baselines.",
    icon: AlertTriangle,
    badge: "Diagnosis",
    highlightColor: "#f87171",
  },
  {
    route: "/scenarios",
    title: "Decarbonization Simulator",
    desc: "Simulate fuel switching (biomass, PNG), renewable open access, and process retrofits with live EBITDA & payback recalculation.",
    icon: Sliders,
    badge: "Simulation",
    highlightColor: "#34d399",
  },
  {
    route: "/actions",
    title: "Circular Action Library",
    desc: "Verified catalog of 40+ engineering interventions with equipment specifications, CapEx quotes, and verified emission factors.",
    icon: RotateCcw,
    badge: "Interventions",
    highlightColor: "#818cf8",
  },
  {
    route: "/portfolio",
    title: "Marginal Abatement Curve",
    desc: "Interactive 3D MACC sorting levers by Net Present Value (₹/tCO2e abated) to identify immediate self-funding operational savings.",
    icon: BarChart3,
    badge: "Capital Planning",
    highlightColor: "#10b981",
  },
  {
    route: "/logistics",
    title: "Multi-Modal Freight Router",
    desc: "Calculate per-shipment emissions across highway, rail, and coastal shipping using the Global Logistics Emissions Council (GLEC) standard.",
    icon: Truck,
    badge: "Scope 3 Logistics",
    highlightColor: "#fbbf24",
  },
  {
    route: "/circular-network",
    title: "Circular Symbiosis Exchange",
    desc: "Regional matchmaking exchange connecting industrial byproducts: fly ash to cement kilns, slag to construction, sludge to co-processing.",
    icon: Network,
    badge: "Industrial Loop",
    highlightColor: "#38bdf8",
  },
  {
    route: "/compliance",
    title: "Statutory Compliance Ledger",
    desc: "Generate official EU CBAM XML registry declarations, India CCTS compliance allowances, and SEBI BRSR Core assurance reports.",
    icon: FileCheck2,
    badge: "Audit Ready",
    highlightColor: "#34d399",
  },
  {
    route: "/methodology",
    title: "Sovereign AI & Provenance",
    desc: "Inspect transparent IPCC Tier 2/3 emission formulas and query the air-gapped sovereign RAG assistant for gazette citations.",
    icon: Bot,
    badge: "Sovereign RAG",
    highlightColor: "#818cf8",
  },
  {
    route: "/workspace",
    title: "Multi-Plant Workspace Hub",
    desc: "Enterprise organization hierarchy managing multi-site factory groups, role-based auditor access, and consolidated footprints.",
    icon: Globe2,
    badge: "Enterprise Hub",
    highlightColor: "#ffffff",
  },
];

export default function LandingFeatureGrid() {
  return (
    <section className="story-section" id="features" style={{ paddingTop: "60px" }}>
      <div className="story-header" style={{ marginBottom: "40px" }}>
        <div className="story-chapter-tag" style={{ color: "#34d399" }}>
          <Layers size={13} />
          <span>Full Application Feature Index</span>
        </div>
        <h2 className="story-title">
          Every Module Connected.<br />
          <span className="landing-editorial" style={{ color: "#34d399" }}>
            Nothing abstracted away.
          </span>
        </h2>
        <p className="story-sub">
          PRANGARA is not a lightweight mockup. Explore the 11 interconnected modules that power sovereign industrial decarbonization:
        </p>
      </div>

      <div className="feature-cards-grid">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <div key={mod.route} className="feature-3d-card">
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="feature-card-icon" style={{ color: mod.highlightColor }}>
                    <Icon size={22} />
                  </div>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      padding: "4px 9px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: mod.highlightColor,
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {mod.badge}
                  </span>
                </div>

                <div className="feature-card-route">prangara.app{mod.route}</div>
                <h3 className="feature-card-title">{mod.title}</h3>
                <p className="feature-card-desc">{mod.desc}</p>
              </div>

              <div>
                <Link
                  to={mod.route}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: mod.highlightColor,
                    textDecoration: "none",
                  }}
                >
                  <span>Launch {mod.title}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
