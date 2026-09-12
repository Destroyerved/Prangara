import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingCaseStudy3D() {
  const steps = [
    {
      day: "Day 01–05",
      title: "Data Ingestion & Anomaly Triangulation",
      desc: "Ingested 12 months of utility invoices, furnace diesel logs, and combed cotton purchase orders. Triggered Rule 01 breach on 780 kWh/t electrical intensity.",
      metric: "24,069 tCO2e Baseline Locked",
    },
    {
      day: "Day 06–12",
      title: "MACC Sequencing & Cashflow Optimization",
      desc: "Ranked 17 engineering interventions. Identified 4 immediate cash-positive quick wins: steam trap overhaul, condensate recovery, and pump VFD retrofits.",
      metric: "₹1.28 Cr Immediate CapEx Identified",
    },
    {
      day: "Day 13–22",
      title: "Circular Sourcing & Freight Shift",
      desc: "Substituted 30% virgin cotton with GRS-certified recycled yarn from nearby cluster. Re-routed outbound shipments to rail intermodal corridor.",
      metric: "−4,100 tCO2e Scope 3 Abated",
    },
    {
      day: "Day 23–30",
      title: "Statutory Ledger & Audit Export",
      desc: "Issued SHA-256 tamper-evident compliance report with Tier-3 direct supplier factors. Exported official EU CBAM XML declaration for export consignments.",
      metric: "CBAM Compliant · Zero Penalty",
    },
  ];

  return (
    <section className="story-section" style={{ paddingTop: "60px" }}>
      <div className="story-header" style={{ marginBottom: "50px" }}>
        <div className="story-chapter-tag" style={{ color: "#fb923c" }}>
          <Calendar size={13} />
          <span>Real-World Implementation Study</span>
        </div>
        <h2 className="story-title">
          The 30-Day Decarbonization Sprint.<br />
          <span className="landing-editorial" style={{ color: "#fb923c" }}>
            Tirupur Textile & Dyeing Mill #04
          </span>
        </h2>
        <p className="story-sub">
          How a 24,000-tonne export facility achieved 25.0% carbon abatement and unlocked ₹4.66 Crore in annual operational EBITDA within 30 days:
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "48px" }}>
        {steps.map((s, idx) => (
          <div
            key={idx}
            className="viz-panel"
            style={{
              background: "rgba(16, 20, 28, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#38bdf8", fontWeight: 700 }}>{s.day}</span>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b" }}>Phase 0{idx + 1}</span>
              </div>
              <h3 style={{ fontSize: "18px", color: "#ffffff", marginBottom: "10px", lineHeight: "1.3" }}>{s.title}</h3>
              <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.6", marginBottom: "20px" }}>{s.desc}</p>
            </div>
            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", fontSize: "12px", color: "#34d399", fontWeight: 600 }}>
              {s.metric}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Scorecard */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(20, 26, 38, 0.9), rgba(12, 15, 22, 0.95))",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          padding: "36px",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "24px",
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#94a3b8", marginBottom: "6px" }}>Gross Carbon Abated</div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: "#10b981", fontFamily: "var(--font-heading)" }}>−6,016 <span style={{ fontSize: "16px", fontWeight: 400, color: "#94a3b8" }}>tCO2e</span></div>
          <div style={{ fontSize: "12px", color: "#10b981" }}>25.0% of Total Baseline</div>
        </div>

        <div style={{ width: "1px", height: "50px", background: "rgba(255, 255, 255, 0.1)" }} />

        <div>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#94a3b8", marginBottom: "6px" }}>Annual EBITDA Savings</div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-heading)" }}>₹4.660 <span style={{ fontSize: "16px", fontWeight: 400, color: "#94a3b8" }}>Cr / yr</span></div>
          <div style={{ fontSize: "12px", color: "#38bdf8" }}>Verified Net Positive Cashflow</div>
        </div>

        <div style={{ width: "1px", height: "50px", background: "rgba(255, 255, 255, 0.1)" }} />

        <div>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#94a3b8", marginBottom: "6px" }}>Capital Payback</div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: "#fb923c", fontFamily: "var(--font-heading)" }}>4.2 <span style={{ fontSize: "16px", fontWeight: 400, color: "#94a3b8" }}>Months</span></div>
          <div style={{ fontSize: "12px", color: "#fb923c" }}>Self-Funding Interventions</div>
        </div>

        <div style={{ width: "1px", height: "50px", background: "rgba(255, 255, 255, 0.1)" }} />

        <div>
          <Link to="/overview" className="landing-btn landing-btn-primary" style={{ padding: "12px 24px", fontSize: "13px" }}>
            <span>Explore Live Dashboard</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
