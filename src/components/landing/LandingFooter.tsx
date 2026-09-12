import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Cpu, Globe2, FileCheck2 } from "lucide-react";
import { PrangaraLogoMark } from "../brand/PrangaraLogo";

export default function LandingFooter() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", padding: "80px 24px 40px", background: "#050608", position: "relative", zIndex: 10 }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Big Banner CTA */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(20, 26, 38, 0.7) 0%, rgba(10, 13, 18, 0.95) 100%)",
            borderRadius: "28px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            padding: "60px 40px",
            textAlign: "center",
            marginBottom: "70px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 30px 80px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.16em", color: "#38bdf8", fontWeight: 700, marginBottom: "20px" }}>
            <Cpu size={14} />
            <span>Sovereign Decarbonization Deployment</span>
          </div>

          <h2 style={{ fontSize: "clamp(32px, 4.5vw, 56px)", color: "#ffffff", maxWidth: "800px", margin: "0 auto 20px", lineHeight: "1.1" }}>
            Ready to turn industrial emissions into<br />
            <span className="landing-editorial" style={{ color: "#34d399" }}>
              verified cashflow?
            </span>
          </h2>

          <p style={{ fontSize: "16px", color: "#94a3b8", maxWidth: "600px", margin: "0 auto 36px", lineHeight: "1.6" }}>
            Experience the complete platform live with pre-calibrated industrial MSME factory data. Zero setup required.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link to="/signin" className="landing-btn landing-btn-primary" style={{ padding: "14px 32px", fontSize: "14px" }}>
              <span>Enter PRANGARA OS</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/overview" className="landing-btn landing-btn-secondary" style={{ padding: "14px 28px", fontSize: "14px" }}>
              <span>Instant Guest Sandbox</span>
            </Link>
          </div>
        </div>

        {/* Technical Standards Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", paddingBottom: "40px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", fontSize: "12px", color: "#64748b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={16} color="#34d399" />
            <span>GHG Protocol Corporate Standard (Scope 1, 2 & 3)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileCheck2 size={16} color="#38bdf8" />
            <span>EU CBAM Regulation (EU) 2023/956 Annex IV</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Globe2 size={16} color="#fb923c" />
            <span>BEE Carbon Credit Trading Scheme (CCTS) Framework</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Cpu size={16} color="#818cf8" />
            <span>Air-Gapped Sovereign RAG Architecture</span>
          </div>
        </div>

        {/* Bottom credits */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <PrangaraLogoMark size={24} />
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#ffffff", letterSpacing: "-0.02em" }}>PRANGARA</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>· Industrial Carbon Intelligence Network</span>
          </div>

          <div style={{ fontSize: "12px", color: "#64748b" }}>
            PS10 Industrial Emission Leak-Point Detector &amp; Circular Alternative Recommender · HackOut’26
          </div>
        </div>
      </div>
    </footer>
  );
}
