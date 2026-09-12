import { useState, useId } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Network,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Truck,
} from "lucide-react";

export default function LandingStory3D() {
  const [activeChapter, setActiveChapter] = useState(0);

  // Chapter 2 Detect Simulation state
  const [activeRule, setActiveRule] = useState(0);

  // Chapter 3 Scenario Lever Simulator state
  const [fuelSwitchPct, setFuelSwitchPct] = useState(60);
  const [recycledBlendPct, setRecycledBlendPct] = useState(30);

  // Chapter 5 Logistics Route state
  const [selectedRoute, setSelectedRoute] = useState(2); // 0: Fastest, 1: Cheapest, 2: Lowest Carbon, 3: Balanced

  const chapters = [
    { id: "measure", number: "01", name: "Measure", title: "Industrial Intake & Carbon Decomposition", modulePath: "/footprint" },
    { id: "detect", number: "02", name: "Detect", title: "Leak Points & Benchmark Breaches", modulePath: "/leaks" },
    { id: "decide", number: "03", name: "Decide", title: "3D MACC & Scenario Levers", modulePath: "/portfolio" },
    { id: "connect", number: "04", name: "Connect", title: "Regional Circular Symbiosis Network", modulePath: "/circular-network" },
    { id: "implement", number: "05", name: "Implement", title: "Multi-Modal Freight & Circular Sourcing", modulePath: "/logistics" },
    { id: "verify", number: "06", name: "Verify", title: "Statutory Ledger & Sovereign RAG", modulePath: "/compliance" },
  ];

  // Dynamic calculations for Chapter 3 Scenario Lever
  const baselineEmissions = 24069;
  const fuelSavings = Math.round((fuelSwitchPct / 100) * 1920);
  const materialSavings = Math.round((recycledBlendPct / 100) * 4100);
  const currentTotalSavings = fuelSavings + materialSavings;
  const currentNetSavingsCr = ((currentTotalSavings * 7800) / 10000000).toFixed(2);

  // Logistics routes data
  const routes = [
    { name: "Fastest Road Highway", dist: "412 km", time: "7 h 10 m", cost: "₹18,900", carbon: 0.71, delta: "Baseline" },
    { name: "Cheapest State Route", dist: "448 km", time: "9 h 05 m", cost: "₹15,400", carbon: 0.68, delta: "−₹3,500" },
    { name: "Lowest Carbon (Rail Intermodal)", dist: "436 km", time: "8 h 40 m", cost: "₹16,200", carbon: 0.52, delta: "−0.19 tCO2e" },
    { name: "Balanced Hybrid Corridor", dist: "424 km", time: "7 h 55 m", cost: "₹17,100", carbon: 0.58, delta: "Balanced" },
  ];

  const uniqueId = useId();

  return (
    <section className="story-section" id="story-root">
      {/* Story Section Header */}
      <div className="story-header">
        <div className="story-chapter-tag">
          <Sparkles size={13} />
          <span>The 6-Stage Industrial Intelligence Architecture</span>
        </div>
        <h2 className="story-title">
          From Raw Meter Invoices to<br />
          <span className="landing-editorial" style={{ color: "#38bdf8" }}>
            Cryptographically Verified Compliance
          </span>
        </h2>
        <p className="story-sub">
          Industrial decarbonization fails when treated as a passive annual accounting exercise.
          PRANGARA connects every factory asset into a continuous loop of detection, marginal cost optimization,
          and circular byproduct exchange.
        </p>
      </div>

      {/* Chapter Rail / Stepper Tabs */}
      <div className="story-stepper-rail">
        {chapters.map((ch, idx) => (
          <button
            key={ch.id}
            type="button"
            className={`story-step-btn ${activeChapter === idx ? "active" : ""}`}
            onClick={() => {
              setActiveChapter(idx);
              const el = document.getElementById(ch.id);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          >
            <span className="step-num">{ch.number}</span>
            <span>{ch.name}</span>
          </button>
        ))}
      </div>

      {/* ================= CHAPTER 01: MEASURE ================= */}
      <div id="measure" style={{ marginBottom: "80px" }}>
        <div className="story-card-stage">
          <div className="story-grid-2col">
            <div>
              <div className="story-chapter-tag" style={{ color: "#fb923c" }}>
                <Activity size={14} />
                <span>Chapter 01 · Intake & Decomposition</span>
              </div>
              <h3 style={{ fontSize: "32px", marginBottom: "16px" }}>
                A total tells you the problem.<br />
                <span className="landing-editorial" style={{ color: "#fb923c" }}>Not what to do about it.</span>
              </h3>
              <p style={{ color: "#94a3b8", lineHeight: "1.65", marginBottom: "24px" }}>
                PRANGARA ingests ERP bills of materials, raw fuel invoices, sub-meter feeds, and logistics manifestos.
                It maps them across Tier-1/2/3 emission factors, decomposing bulk footprints into precise upstream,
                combustion, and process streams.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="scope-chip scope-chip-1">Scope 1 · 3,420 tCO2e</span>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Boiler coal, diesel generators, furnace combustion</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="scope-chip scope-chip-2">Scope 2 · 6,050 tCO2e</span>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>State grid electricity (CEA CO2 Baseline Database v20.0)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="scope-chip scope-chip-3">Scope 3 · 14,599 tCO2e</span>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Purchased raw cotton yarn (60.6% dominant hotspot)</span>
                </div>
              </div>

              <Link to="/footprint" className="landing-btn landing-btn-secondary">
                <span>View Live Footprint Module</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Live Interactive Sankey Decomposition Visualizer */}
            <div className="viz-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", fontWeight: 700 }}>
                  GHG Protocol Carbon Stream Sankey (24,069 tCO2e)
                </span>
                <span style={{ fontSize: "11px", color: "#34d399", fontFamily: "var(--font-mono)" }}>Deterministic Engine</span>
              </div>

              {/* Schematic SVG Sankey Flow */}
              <svg viewBox="0 0 600 280" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                <defs>
                  <linearGradient id={`${uniqueId}-flow1`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id={`${uniqueId}-flow2`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id={`${uniqueId}-flow3`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Stream Nodes Left */}
                <rect x="20" y="30" width="10" height="40" rx="3" fill="#fb923c" />
                <text x="38" y="54" fill="#e2e8f0" fontSize="12" fontWeight="600">Thermal Coal & Diesel (3,420 t)</text>

                <rect x="20" y="100" width="10" height="55" rx="3" fill="#818cf8" />
                <text x="38" y="132" fill="#e2e8f0" fontSize="12" fontWeight="600">Grid Substation (6,050 t)</text>

                <rect x="20" y="185" width="10" height="80" rx="3" fill="#38bdf8" />
                <text x="38" y="230" fill="#e2e8f0" fontSize="12" fontWeight="600">Raw Combed Cotton (14,599 t)</text>

                {/* Curved Connectors to Middle */}
                <path d="M 30 50 C 200 50, 200 140, 360 140" fill="none" stroke={`url(#${uniqueId}-flow1)`} strokeWidth="16" />
                <path d="M 30 127 C 200 127, 200 140, 360 140" fill="none" stroke={`url(#${uniqueId}-flow2)`} strokeWidth="24" />
                <path d="M 30 225 C 200 225, 200 140, 360 140" fill="none" stroke={`url(#${uniqueId}-flow3)`} strokeWidth="48" />

                {/* Center Gateway */}
                <rect x="360" y="70" width="14" height="140" rx="4" fill="#ffffff" />
                <text x="385" y="135" fill="#ffffff" fontSize="13" fontWeight="700">Factory Boundary</text>
                <text x="385" y="152" fill="#94a3b8" fontSize="11">Total: 24,069 tCO2e</text>

                {/* Product Outbound Line */}
                <path d="M 374 140 C 460 140, 480 140, 540 140" fill="none" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="32" />
                <rect x="540" y="100" width="12" height="80" rx="4" fill="#34d399" />
                <text x="560" y="138" fill="#34d399" fontSize="12" fontWeight="700">Finished</text>
                <text x="560" y="152" fill="#94a3b8" fontSize="10">Goods Out</text>
              </svg>

              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "#64748b" }}>
                <span>Standard: GHG Protocol Corporate Standard</span>
                <span>Uncertainty: ±4.8% (Tier 2 Primary Invoices)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CHAPTER 02: DETECT ================= */}
      <div id="detect" style={{ marginBottom: "80px" }}>
        <div className="story-card-stage">
          <div className="story-grid-2col">
            <div>
              <div className="story-chapter-tag" style={{ color: "#f87171" }}>
                <ShieldAlert size={14} />
                <span>Chapter 02 · Leak Point Detection</span>
              </div>
              <h3 style={{ fontSize: "32px", marginBottom: "16px" }}>
                Big is not always a leak.<br />
                <span className="landing-editorial" style={{ color: "#f87171" }}>Proof is in the cluster benchmark.</span>
              </h3>
              <p style={{ color: "#94a3b8", lineHeight: "1.65", marginBottom: "24px" }}>
                A large emission stream isn't necessarily wasteful. PRANGARA evaluates emissions against real BEE
                MSME industrial cluster studies, flagging true operational leak points based on statistically defensible
                rule packs rather than generic assumptions.
              </p>

              {/* 3 Diagnostic Rule Tabs */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                {[
                  { title: "RULE 01: Benchmark Breach", desc: "Electricity intensity (780 kWh/t) exceeds reported BEE cluster range (480–690 kWh/t). Proof that efficiency is leaking." },
                  { title: "RULE 02: Material Concentration", desc: "Virgin combed cotton represents 60.6% of gross footprint. Supplier substitution becomes a major carbon lever." },
                  { title: "RULE 03: Structural Thermal Hotspot", desc: "Dyeing boiler flue gas loss diagnosed at 18.4% above best-in-class condensing economizer benchmarks." },
                ].map((r, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveRule(i)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: activeRule === i ? "rgba(248, 113, 113, 0.12)" : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${activeRule === i ? "rgba(248, 113, 113, 0.35)" : "rgba(255, 255, 255, 0.06)"}`,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600, color: activeRule === i ? "#f87171" : "#ffffff", marginBottom: "4px" }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{r.desc}</div>
                  </div>
                ))}
              </div>

              <Link to="/leaks" className="landing-btn landing-btn-secondary">
                <span>Explore Leak Detection Module</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Interactive Benchmark Breach Gauge */}
            <div className="viz-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", fontWeight: 700 }}>
                  BEE Cluster Study · Textile Dyeing Electricity Intensity
                </span>
                <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 700 }}>+90 kWh/t BREACH</span>
              </div>

              <div className="benchmark-track-wrapper">
                <div className="benchmark-bar-track">
                  {/* Reported cluster range 30% to 75% */}
                  <div className="benchmark-range-highlight" style={{ left: "25%", width: "45%" }} />

                  {/* Plant Pin at 85% */}
                  <div className="benchmark-pin" style={{ left: "84%" }}>
                    <div className="benchmark-pin-bubble">
                      This Plant · 780 kWh/t
                    </div>
                    <div className="benchmark-pin-line" />
                  </div>
                </div>

                {/* Track Labels */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", fontSize: "11px", color: "#64748b" }}>
                  <span>Low Intensity: 480 kWh/t</span>
                  <span style={{ color: "#34d399", fontWeight: 600 }}>Cluster Median (p50): 585 kWh/t</span>
                  <span>High Threshold: 690 kWh/t</span>
                </div>
              </div>

              {/* Diagnosis Callout Card */}
              <div style={{
                marginTop: "32px",
                padding: "16px",
                borderRadius: "14px",
                background: "rgba(248, 113, 113, 0.08)",
                border: "1px solid rgba(248, 113, 113, 0.2)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f87171", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  <AlertCircle size={15} />
                  <span>ACTIONABLE CARBON DIAGNOSIS</span>
                </div>
                <p style={{ fontSize: "12.5px", color: "#e2e8f0", lineHeight: "1.5", margin: 0 }}>
                  Plant electrical intensity is 33% above the cluster benchmark median. Root cause: un-throttled liquor-ratio
                  circulation pumps and compressed air line micro-fissures. Potential annual recovery: <strong>1,420 tCO2e</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CHAPTER 03: DECIDE ================= */}
      <div id="decide" style={{ marginBottom: "80px" }}>
        <div className="story-card-stage">
          <div className="story-grid-2col">
            <div>
              <div className="story-chapter-tag" style={{ color: "#10b981" }}>
                <BarChart3 size={14} />
                <span>Chapter 03 · 3D MACC & Scenario Simulator</span>
              </div>
              <h3 style={{ fontSize: "32px", marginBottom: "16px" }}>
                Prioritize actions by cashflow.<br />
                <span className="landing-editorial" style={{ color: "#10b981" }}>Every abatement has a price tag.</span>
              </h3>
              <p style={{ color: "#94a3b8", lineHeight: "1.65", marginBottom: "24px" }}>
                Decarbonization is not charity. The Marginal Abatement Cost Curve (MACC) ranks every intervention
                by Net Present Value (₹/tCO2e abated). The levers below the zero-line pay for themselves;
                the savings fund the structural capital investments.
              </p>

              {/* Interactive Scenario Levers */}
              <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "18px", borderRadius: "16px", border: "1px solid var(--l-border)", marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#38bdf8", fontWeight: 700, marginBottom: "14px" }}>
                  Interactive Live Lever Simulation
                </div>

                {/* Lever 1: Fuel Switch */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "6px" }}>
                    <span>Biomass Briquette Co-Firing Switch</span>
                    <strong style={{ color: "#10b981" }}>{fuelSwitchPct}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={fuelSwitchPct}
                    onChange={(e) => setFuelSwitchPct(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#10b981", cursor: "pointer" }}
                  />
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>−{fuelSavings} tCO2e Scope 1 reduction</div>
                </div>

                {/* Lever 2: Recycled Cotton Blend */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "6px" }}>
                    <span>Recycled-Blend Yarn Substitution</span>
                    <strong style={{ color: "#38bdf8" }}>{recycledBlendPct}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={recycledBlendPct}
                    onChange={(e) => setRecycledBlendPct(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
                  />
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>−{materialSavings} tCO2e Scope 3 reduction</div>
                </div>
              </div>

              <Link to="/portfolio" className="landing-btn landing-btn-secondary">
                <span>Launch MACC Portfolio Module</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Dynamic MACC Curve Representation */}
            <div className="viz-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", fontWeight: 700 }}>
                  Marginal Abatement Cost Curve (₹ / tCO2e)
                </span>
                <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 700 }}>
                  Total Impact: −{currentTotalSavings} tCO2e
                </span>
              </div>

              {/* Schematic MACC Bar Chart */}
              <div style={{ height: "200px", display: "flex", alignItems: "center", gap: "6px", position: "relative", borderBottom: "1px dashed rgba(255, 255, 255, 0.25)" }}>
                {/* Zero line */}
                <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: "1px", background: "rgba(255, 255, 255, 0.2)", pointerEvents: "none" }} />
                <span style={{ position: "absolute", right: 0, top: "43%", fontSize: "9.5px", color: "#94a3b8" }}>₹0 / t (Break-even)</span>

                {/* Cash positive levers (Negative cost, below zero) */}
                <div style={{ flex: 1.2, height: "70px", alignSelf: "flex-end", background: "#10b981", borderRadius: "4px", opacity: 0.85 }} title="Steam Trap Survey: -₹12,500/t" />
                <div style={{ flex: 2.5, height: "65px", alignSelf: "flex-end", background: "#10b981", borderRadius: "4px", opacity: 0.95 }} title="Recycled Cotton Blend: -₹8,500/t" />
                <div style={{ flex: 1.4, height: "45px", alignSelf: "flex-end", background: "#34d399", borderRadius: "4px" }} title="Rooftop Solar 900 kWp: -₹6,500/t" />
                <div style={{ flex: 1.0, height: "35px", alignSelf: "flex-end", background: "#34d399", borderRadius: "4px" }} title="VFD Process Pumps: -₹7,300/t" />

                {/* Structural CapEx levers (Positive cost, above zero) */}
                <div style={{ flex: 1.1, height: "40px", alignSelf: "flex-start", background: "#f87171", borderRadius: "4px" }} title="Industrial Heat Pump: +₹1,400/t" />
                <div style={{ flex: 1.3, height: "75px", alignSelf: "flex-start", background: "#fb7185", borderRadius: "4px" }} title="Open-Access Green Tariff: +₹5,900/t" />
                <div style={{ flex: 0.9, height: "95px", alignSelf: "flex-start", background: "#f43f5e", borderRadius: "4px" }} title="Hydrogen Pilot Burner: +₹14,000/t" />
              </div>

              {/* Dynamic Financial Ticker */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px" }}>
                <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  <div style={{ fontSize: "10.5px", textTransform: "uppercase", color: "#94a3b8" }}>Net Annual Savings</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#10b981" }}>+₹{currentNetSavingsCr} Cr / yr</div>
                </div>
                <div style={{ background: "rgba(56, 189, 248, 0.08)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                  <div style={{ fontSize: "10.5px", textTransform: "uppercase", color: "#94a3b8" }}>Residual Footprint</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#38bdf8" }}>{baselineEmissions - currentTotalSavings} tCO2e</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CHAPTER 04: CONNECT ================= */}
      <div id="connect" style={{ marginBottom: "80px" }}>
        <div className="story-card-stage">
          <div className="story-grid-2col">
            <div>
              <div className="story-chapter-tag" style={{ color: "#38bdf8" }}>
                <Network size={14} />
                <span>Chapter 04 · Industrial Symbiosis</span>
              </div>
              <h3 style={{ fontSize: "32px", marginBottom: "16px" }}>
                One plant's emission waste is<br />
                <span className="landing-editorial" style={{ color: "#38bdf8" }}>another plant's raw material.</span>
              </h3>
              <p style={{ color: "#94a3b8", lineHeight: "1.65", marginBottom: "24px" }}>
                No factory exists in isolation. PRANGARA models regional industrial clusters as interconnected
                material loops. Boiler fly ash fuels green cement; spent cotton combing waste supplies local cardboard mills;
                foundry slag replaces mined aggregates.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                  <RotateCcw size={16} color="#34d399" />
                  <span><strong>120 t/mo Sludge Co-Processing</strong> with Chettinad Cement Kiln</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                  <RotateCcw size={16} color="#38bdf8" />
                  <span><strong>40 t/mo Combing Waste</strong> traded to Pallipalayam Paper Mill</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                  <RotateCcw size={16} color="#fb923c" />
                  <span><strong>Spent Condensate Loop</strong> feeding adjacent cluster dye baths</span>
                </div>
              </div>

              <Link to="/circular-network" className="landing-btn landing-btn-secondary">
                <span>View Circular Network Exchange</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Schematic Node Network Visualizer */}
            <div className="viz-panel">
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", fontWeight: 700, marginBottom: "16px" }}>
                Regional Industrial Byproduct Flow · Tamil Nadu Cluster
              </div>

              <svg viewBox="0 0 500 240" style={{ width: "100%", height: "auto" }}>
                {/* Connection lines */}
                <line x1="100" y1="60" x2="250" y2="120" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="100" y1="180" x2="250" y2="120" stroke="#34d399" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="250" y1="120" x2="400" y2="60" stroke="#fb923c" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="250" y1="120" x2="400" y2="180" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 4" />

                {/* Node 1: Tirupur Knitwear */}
                <circle cx="100" cy="60" r="22" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                <text x="100" y="64" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">Tirupur</text>
                <text x="100" y="94" textAnchor="middle" fill="#94a3b8" fontSize="9">Textile Mill</text>

                {/* Node 2: Bio-Pellet Supplier */}
                <circle cx="100" cy="180" r="22" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
                <text x="100" y="184" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">Karur</text>
                <text x="100" y="214" textAnchor="middle" fill="#94a3b8" fontSize="9">Biomass Fuels</text>

                {/* Hub Node: Coimbatore Foundry */}
                <circle cx="250" cy="120" r="30" fill="#0f172a" stroke="#ffffff" strokeWidth="3" />
                <text x="250" y="124" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800">PRANGARA</text>
                <text x="250" y="137" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="600">SYMBIO HUB</text>

                {/* Node 4: Chettinad Cement */}
                <circle cx="400" cy="60" r="22" fill="#1e293b" stroke="#fb923c" strokeWidth="2" />
                <text x="400" y="64" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">Salem</text>
                <text x="400" y="94" textAnchor="middle" fill="#94a3b8" fontSize="9">Cement Kiln</text>

                {/* Node 5: Paper Mill */}
                <circle cx="400" cy="180" r="22" fill="#1e293b" stroke="#818cf8" strokeWidth="2" />
                <text x="400" y="184" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">Erode</text>
                <text x="400" y="214" textAnchor="middle" fill="#94a3b8" fontSize="9">Paper Mill</text>
              </svg>

              <div style={{ marginTop: "12px", textAlign: "center", fontSize: "11px", color: "#64748b" }}>
                Active symbiosis match: <strong>₹28.4L</strong> annual waste disposal cost converted into raw material revenue.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CHAPTER 05: IMPLEMENT ================= */}
      <div id="implement" style={{ marginBottom: "80px" }}>
        <div className="story-card-stage">
          <div className="story-grid-2col">
            <div>
              <div className="story-chapter-tag" style={{ color: "#818cf8" }}>
                <Truck size={14} />
                <span>Chapter 05 · Multi-Modal Logistics</span>
              </div>
              <h3 style={{ fontSize: "32px", marginBottom: "16px" }}>
                One shipment.<br />
                <span className="landing-editorial" style={{ color: "#818cf8" }}>Four defensible answers.</span>
              </h3>
              <p style={{ color: "#94a3b8", lineHeight: "1.65", marginBottom: "24px" }}>
                Embodied carbon doesn't stop at the factory gate. Freight optimization calculates fuel-burn emission factors
                per tonne-kilometer across road, rail, and coastal shipping, providing defensible trade-offs between
                cost, transit time, and statutory carbon intensity.
              </p>

              {/* Selectable Route Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                {routes.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedRoute(i)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: selectedRoute === i ? "rgba(129, 140, 248, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${selectedRoute === i ? "rgba(129, 140, 248, 0.4)" : "rgba(255, 255, 255, 0.06)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      fontSize: "12.5px",
                    }}
                  >
                    <div>
                      <strong style={{ color: selectedRoute === i ? "#ffffff" : "#cbd5e1" }}>{r.name}</strong>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{r.dist} · {r.time}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: i === 2 ? "#34d399" : "#ffffff" }}>{r.carbon} tCO2e</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{r.cost}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/logistics" className="landing-btn landing-btn-secondary">
                <span>Launch Logistics Optimizer</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Circular Material Specification Card */}
            <div className="viz-panel">
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", fontWeight: 700, marginBottom: "16px" }}>
                Circular Material Substitution Specification
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Baseline */}
                <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#f87171", fontWeight: 700, marginBottom: "6px" }}>Baseline Material</div>
                  <h4 style={{ fontSize: "14px", marginBottom: "10px" }}>Virgin Combed Cotton 30s</h4>
                  <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div>Purchase: <strong>₹248 / kg</strong></div>
                    <div>Embodied: <strong style={{ color: "#f87171" }}>6.10 tCO2e / t</strong></div>
                    <div>Recycled: <strong>0%</strong></div>
                    <div>Freight: <strong>340 km (Road)</strong></div>
                  </div>
                </div>

                {/* Recommended Substitution */}
                <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(52, 211, 153, 0.06)", border: "1px solid rgba(52, 211, 153, 0.25)" }}>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#34d399", fontWeight: 700, marginBottom: "6px" }}>Verified Circular Match</div>
                  <h4 style={{ fontSize: "14px", marginBottom: "10px", color: "#34d399" }}>20% rCotton Combed Blend</h4>
                  <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div>Purchase: <strong style={{ color: "#34d399" }}>₹241 / kg (−3%)</strong></div>
                    <div>Embodied: <strong style={{ color: "#34d399" }}>4.88 tCO2e / t (−20%)</strong></div>
                    <div>Certification: <strong>GRS + EPD</strong></div>
                    <div>Freight: <strong>120 km (Rail Corridor)</strong></div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "16px", padding: "12px", borderRadius: "10px", background: "rgba(129, 140, 248, 0.08)", border: "1px solid rgba(129, 140, 248, 0.2)", fontSize: "12px" }}>
                <strong>Impact Summary:</strong> Switching 1,200 t/year raw input saves <strong>1,464 tCO2e</strong> and saves <strong>₹84 Lakhs</strong> in purchase costs.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CHAPTER 06: VERIFY ================= */}
      <div id="verify" style={{ marginBottom: "40px" }}>
        <div className="story-card-stage">
          <div className="story-grid-2col">
            <div>
              <div className="story-chapter-tag" style={{ color: "#34d399" }}>
                <FileCheck2 size={14} />
                <span>Chapter 06 · Statutory Compliance & Sovereign AI</span>
              </div>
              <h3 style={{ fontSize: "32px", marginBottom: "16px" }}>
                Audit-ready truth.<br />
                <span className="landing-editorial" style={{ color: "#34d399" }}>Zero hallucinations.</span>
              </h3>
              <p style={{ color: "#94a3b8", lineHeight: "1.65", marginBottom: "24px" }}>
                When international cross-border carbon taxes and national trading compliance come due, estimates won't hold up.
                PRANGARA generates immutable, cryptographic SHA-256 audit trails and formats declarations directly into
                official statutory standards.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                  <CheckCircle2 size={16} color="#34d399" />
                  <span><strong>EU CBAM Registry XML:</strong> Official XML schema export with Tier-3 direct supplier factors</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                  <CheckCircle2 size={16} color="#34d399" />
                  <span><strong>India CCTS Readiness:</strong> Compliance target tracking under BEE Energy Conservation Act</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                  <CheckCircle2 size={16} color="#34d399" />
                  <span><strong>SEBI BRSR Core:</strong> Reasonable assurance audit packs with complete invoice provenance</span>
                </div>
              </div>

              <Link to="/compliance" className="landing-btn landing-btn-secondary">
                <span>View Compliance Ledger</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Cryptographic Hash Chain Card */}
            <div className="viz-panel">
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", fontWeight: 700, marginBottom: "14px" }}>
                Cryptographic Audit Trail (SHA-256 Provenance)
              </div>

              <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", background: "rgba(0, 0, 0, 0.5)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "14px" }}>
                <div style={{ color: "#64748b", marginBottom: "4px" }}>// Block #04291 · Verified 2026-09-12</div>
                <div style={{ color: "#34d399" }}>hash: e4b27c81d39f...710a</div>
                <div style={{ color: "#94a3b8" }}>prev: 98df10ac33b2...c014</div>
                <div style={{ color: "#cbd5e1", marginTop: "6px" }}>merkle_root: 3a7f8812e...</div>
                <div style={{ color: "#38bdf8", marginTop: "4px" }}>auditor_signature: Verified (Bureau of Energy Efficiency)</div>
              </div>

              {/* Sovereign RAG Assistant Teaser */}
              <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(56, 189, 248, 0.06)", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontSize: "11.5px", fontWeight: 700, marginBottom: "6px" }}>
                  <Sparkles size={13} />
                  <span>SOVEREIGN RAG ASSISTANT CITATION</span>
                </div>
                <p style={{ fontSize: "12px", color: "#e2e8f0", lineHeight: "1.45", margin: 0 }}>
                  "Pursuant to EU CBAM Regulation (EU) 2023/956, Annex IV §3.2, direct emissions from boiler coal combustion
                  must apply the national net calorific value factor unless facility laboratory stoichiometry is registered."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
