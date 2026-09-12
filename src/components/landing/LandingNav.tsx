import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PrangaraLogoMark } from "../brand/PrangaraLogo";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { setSession } from "../../api/platform";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleInstantDemo = (role: "owner" | "compliance" | "admin") => {
    // Generate mock demo session tokens so the user can immediately enter /overview
    const demoTokens = {
      access_token: `demo-${role}-${Date.now()}`,
      refresh_token: `refresh-${role}-${Date.now()}`,
      token_type: "bearer",
      expires_in: 86400,
    };
    setSession({ tokens: demoTokens });
    navigate("/overview");
  };

  return (
    <>
      <header className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <PrangaraLogoMark size={28} />
          <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
            <span style={{ fontFamily: "var(--font-heading, 'Manrope Variable')", fontWeight: 800, fontSize: "16px", letterSpacing: "-0.04em", color: "#ffffff" }}>
              PRANGARA
            </span>
          </div>
          <div className="landing-brand-tag">
            <span className="dot" />
            <span>Industrial Intelligence</span>
          </div>
        </div>

        <nav className="landing-nav-links" aria-label="Story Chapters">
          <a href="#measure" className="landing-nav-link">01. Measure</a>
          <a href="#detect" className="landing-nav-link">02. Detect</a>
          <a href="#decide" className="landing-nav-link">03. Decide</a>
          <a href="#connect" className="landing-nav-link">04. Connect</a>
          <a href="#implement" className="landing-nav-link">05. Implement</a>
          <a href="#verify" className="landing-nav-link">06. Verify</a>
          <a href="#benchmarks" className="landing-nav-link">BEE Benchmarks</a>
          <a href="#features" className="landing-nav-link">All Modules</a>
        </nav>

        <div className="landing-nav-actions">
          <button
            type="button"
            className="landing-btn landing-btn-secondary"
            onClick={() => setShowDemoModal(!showDemoModal)}
            title="Fast 1-Click Access for Evaluators"
          >
            <Sparkles size={14} color="#38bdf8" />
            <span>Demo Logins</span>
          </button>

          <Link to="/signin" className="landing-btn landing-btn-ghost">
            <Lock size={13} />
            <span>Sign In</span>
          </Link>

          <Link to="/signin" className="landing-btn landing-btn-primary">
            <span>Enter App</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* 1-Click Demo Accounts Quick Access Modal */}
      {showDemoModal && (
        <div
          style={{
            position: "fixed",
            top: "90px",
            right: "32px",
            zIndex: 110,
            width: "360px",
            background: "rgba(14, 17, 23, 0.95)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            borderRadius: "20px",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75)",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#38bdf8", fontWeight: 700 }}>
              1-Click Instant Demo Access
            </span>
            <button
              onClick={() => setShowDemoModal(false)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px", lineHeight: "1.45" }}>
            Select a verified role to instantly enter the PRANGARA Industrial Decarbonization OS with full privileges:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={() => handleInstantDemo("owner")}
              className="demo-account-pill"
            >
              <div>
                <div style={{ fontWeight: 600, color: "#ffffff" }}>Hitesh Patel</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Plant Owner · Rajkot Metal</div>
              </div>
              <span className="demo-role-tag">Plant Owner</span>
            </button>
            <button
              onClick={() => handleInstantDemo("compliance")}
              className="demo-account-pill"
            >
              <div>
                <div style={{ fontWeight: 600, color: "#ffffff" }}>Anita Shah</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Auditor · Shah & Associates</div>
              </div>
              <span className="demo-role-tag" style={{ background: "rgba(129, 140, 248, 0.15)", color: "#818cf8" }}>Compliance</span>
            </button>
            <button
              onClick={() => handleInstantDemo("admin")}
              className="demo-account-pill"
            >
              <div>
                <div style={{ fontWeight: 600, color: "#ffffff" }}>Priya Admin</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Platform Director · PRANGARA</div>
              </div>
              <span className="demo-role-tag" style={{ background: "rgba(52, 211, 153, 0.15)", color: "#34d399" }}>Admin</span>
            </button>
          </div>
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between" }}>
            <Link
              to="/signin"
              onClick={() => setShowDemoModal(false)}
              style={{ fontSize: "11px", color: "#38bdf8", textDecoration: "none" }}
            >
              Custom credentials login →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
