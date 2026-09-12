import { useState, useRef, useEffect, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, ShieldCheck, TrendingDown, Cpu, ChevronRight, AlertTriangle } from "lucide-react";

export default function LandingHero3D() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle & Ambient Grid Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 1.6 + 0.6,
      alpha: Math.random() * 0.4 + 0.2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Soft radial glow at top
      const grad = ctx.createRadialGradient(width / 2, height * 0.2, 50, width / 2, height * 0.2, width * 0.6);
      grad.addColorStop(0, "rgba(56, 189, 248, 0.08)");
      grad.addColorStop(0.5, "rgba(52, 211, 153, 0.03)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render connected telemetry particles
      ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect near neighbors
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 3D Perspective Tilt on Mouse Movement
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -(y * 14), y: x * 18 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section className="landing-hero">
      <canvas ref={canvasRef} className="landing-bg-canvas" />

      {/* Pill Badge */}
      <div className="landing-pill-badge">
        <span className="spark" />
        <span>PRANGARA 2.0 · Sovereign Decarbonization Intelligence OS</span>
      </div>

      {/* Headline */}
      <h1 className="landing-hero-title">
        Measure emissions. Detect leaks.<br />
        <span className="landing-editorial" style={{ color: "#38bdf8" }}>
          Decide with industrial precision.
        </span>
      </h1>

      {/* Subtitle */}
      <p className="landing-hero-subtitle">
        An industrial carbon intelligence network built for hard-to-abate manufacturing. We convert raw factory
        meters, BOM invoices, and utility streams into verified marginal abatement curves, circular byproduct matches,
        and statutory audit-ready EU CBAM and India CCTS ledgers.
      </p>

      {/* Actions */}
      <div className="landing-hero-actions">
        <Link to="/signin" className="landing-btn landing-btn-primary" style={{ padding: "13px 28px", fontSize: "14px" }}>
          <span>Enter Industrial OS</span>
          <ArrowRight size={16} />
        </Link>
        <a href="#measure" className="landing-btn landing-btn-secondary" style={{ padding: "13px 24px", fontSize: "14px" }}>
          <Play size={14} fill="currentColor" />
          <span>Explore 3D Story</span>
        </a>
      </div>

      {/* Telemetry Metrics Strip */}
      <div className="landing-telemetry-strip">
        <div className="landing-telemetry-item">
          <div className="landing-telemetry-val" style={{ color: "#fb923c" }}>24,069 t</div>
          <div className="landing-telemetry-lbl">Baseline Footprint</div>
        </div>
        <div style={{ width: "1px", height: "30px", background: "rgba(255, 255, 255, 0.08)" }} />
        <div className="landing-telemetry-item">
          <div className="landing-telemetry-val" style={{ color: "#10b981" }}>−6,016 t</div>
          <div className="landing-telemetry-lbl">Cash-Positive Abatement</div>
        </div>
        <div style={{ width: "1px", height: "30px", background: "rgba(255, 255, 255, 0.08)" }} />
        <div className="landing-telemetry-item">
          <div className="landing-telemetry-val" style={{ color: "#38bdf8" }}>₹4.660 Cr</div>
          <div className="landing-telemetry-lbl">Net Annual Savings</div>
        </div>
        <div style={{ width: "1px", height: "30px", background: "rgba(255, 255, 255, 0.08)" }} />
        <div className="landing-telemetry-item">
          <div className="landing-telemetry-val" style={{ color: "#818cf8" }}>4.2 Mo</div>
          <div className="landing-telemetry-lbl">Average Payback</div>
        </div>
        <div style={{ width: "1px", height: "30px", background: "rgba(255, 255, 255, 0.08)" }} />
        <div className="landing-telemetry-item">
          <div className="landing-telemetry-val" style={{ color: "#ffffff" }}>SHA-256</div>
          <div className="landing-telemetry-lbl">Statutory Provenance</div>
        </div>
      </div>

      {/* 3D Interactive Preview Frame */}
      <div className="landing-3d-stage-wrapper perspective-container">
        <div
          ref={previewRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="landing-preview-card-3d preserve-3d"
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(10px)`,
          }}
        >
          {/* Top Window Bar */}
          <div className="landing-preview-topbar">
            <div className="landing-window-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="landing-preview-route-pill">
              prangara.app/overview · Coimbatore Foundry #02 (Live Demonstration)
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "11px", color: "#34d399" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
              Telemetry Synchronized
            </div>
          </div>

          {/* Interactive Mock Dashboard Body */}
          <div style={{ padding: "32px", textAlign: "left", background: "linear-gradient(180deg, rgba(14, 18, 26, 0.95), rgba(8, 10, 14, 0.98))" }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#64748b", fontWeight: 700, marginBottom: "4px" }}>
                  OPERATIONAL TELEMETRY & AUDIT GATE
                </div>
                <h2 style={{ fontSize: "28px", margin: 0 }}>Executive Carbon & Financial Balance</h2>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <span className="scope-chip scope-chip-1">Scope 1: 3,420 t</span>
                <span className="scope-chip scope-chip-2">Scope 2: 6,050 t</span>
                <span className="scope-chip scope-chip-3">Scope 3: 14,599 t</span>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <div className="viz-panel" style={{ background: "rgba(18, 22, 30, 0.6)" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#94a3b8", marginBottom: "6px" }}>Gross Footprint</div>
                <div style={{ fontSize: "26px", fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-heading)" }}>24,069 <span style={{ fontSize: "14px", fontWeight: 400, color: "#64748b" }}>tCO2e</span></div>
                <div style={{ fontSize: "12px", color: "#f87171", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <TrendingDown size={13} style={{ transform: "rotate(180deg)" }} /> +3.2% vs cluster p50
                </div>
              </div>

              <div className="viz-panel" style={{ background: "rgba(18, 22, 30, 0.6)" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#94a3b8", marginBottom: "6px" }}>Identified Leaks</div>
                <div style={{ fontSize: "26px", fontWeight: 700, color: "#fb923c", fontFamily: "var(--font-heading)" }}>3 <span style={{ fontSize: "14px", fontWeight: 400, color: "#64748b" }}>Critical Hotspots</span></div>
                <div style={{ fontSize: "12px", color: "#fb923c", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertTriangle size={13} /> 1,420 t breach in dyeing steam
                </div>
              </div>

              <div className="viz-panel" style={{ background: "rgba(18, 22, 30, 0.6)" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#94a3b8", marginBottom: "6px" }}>Immediate Abatement</div>
                <div style={{ fontSize: "26px", fontWeight: 700, color: "#10b981", fontFamily: "var(--font-heading)" }}>−25.0% <span style={{ fontSize: "14px", fontWeight: 400, color: "#64748b" }}>6,016 tCO2e</span></div>
                <div style={{ fontSize: "12px", color: "#10b981", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <TrendingDown size={13} /> ₹4.66 Cr net positive savings
                </div>
              </div>

              <div className="viz-panel" style={{ background: "rgba(18, 22, 30, 0.6)" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#94a3b8", marginBottom: "6px" }}>Statutory Audit Score</div>
                <div style={{ fontSize: "26px", fontWeight: 700, color: "#38bdf8", fontFamily: "var(--font-heading)" }}>94.2% <span style={{ fontSize: "14px", fontWeight: 400, color: "#64748b" }}>CBAM / CCTS</span></div>
                <div style={{ fontSize: "12px", color: "#38bdf8", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <ShieldCheck size={13} /> Tier-3 emission factor verified
                </div>
              </div>
            </div>

            {/* Bottom mini teaser bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px",
              borderRadius: "12px",
              background: "rgba(56, 189, 248, 0.05)",
              border: "1px solid rgba(56, 189, 248, 0.15)",
              fontSize: "12.5px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Cpu size={16} color="#38bdf8" />
                <span><strong>Sovereign Assistant Active:</strong> Ready to generate CBAM XML Declaration and CCTS Allowance Portfolio.</span>
              </div>
              <Link to="/overview" style={{ color: "#38bdf8", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                Enter Live Workspace <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
