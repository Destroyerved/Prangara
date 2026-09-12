import { useState } from "react";
import { Award, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface SectorBenchmark {
  id: string;
  name: string;
  cluster: string;
  unit: string;
  low: number;
  median: number;
  high: number;
  samplePlant: number;
  primaryLeak: string;
  topLever: string;
  paybackMonths: number;
}

const SECTORS: SectorBenchmark[] = [
  {
    id: "textile",
    name: "Textile Dyeing & Finishing",
    cluster: "Tirupur, Tamil Nadu",
    unit: "kWh / t finished fabric",
    low: 480,
    median: 585,
    high: 690,
    samplePlant: 780,
    primaryLeak: "Un-insulated steam lines & un-throttled liquor circulation pumps",
    topLever: "Condensate heat recovery & VFD on dye baths",
    paybackMonths: 3.8,
  },
  {
    id: "foundry",
    name: "Foundry & Metal Casting",
    cluster: "Coimbatore, Tamil Nadu",
    unit: "kWh / t liquid metal",
    low: 510,
    median: 620,
    high: 740,
    samplePlant: 810,
    primaryLeak: "Induction furnace holding loss & slag thermal quenching",
    topLever: "Ladle pre-heating & dry slag heat recovery",
    paybackMonths: 4.5,
  },
  {
    id: "steel",
    name: "Steel Re-rolling Mills",
    cluster: "Mandi Gobindgarh, Punjab",
    unit: "kg coal / t rolled steel",
    low: 38,
    median: 48,
    high: 62,
    samplePlant: 68,
    primaryLeak: "Reheating furnace air-fuel ratio drift & scale loss",
    topLever: "Recuperator combustion air pre-heating to 350°C",
    paybackMonths: 5.2,
  },
  {
    id: "aluminum",
    name: "Aluminum Extrusion & Die Casting",
    cluster: "Rajkot, Gujarat",
    unit: "kWh / t billet extruded",
    low: 720,
    median: 860,
    high: 1020,
    samplePlant: 1090,
    primaryLeak: "Compressed air leakages in pneumatic pullers & billet cooling blowers",
    topLever: "Vane compressor replacement & infrared billet heating",
    paybackMonths: 4.1,
  },
  {
    id: "ceramics",
    name: "Ceramics & Sanitaryware",
    cluster: "Morbi, Gujarat",
    unit: "SCM gas / t fired tile",
    low: 110,
    median: 135,
    high: 165,
    samplePlant: 178,
    primaryLeak: "Tunnel kiln chimney exhaust heat venting without recuperation",
    topLever: "Exhaust flue-gas drying air recirculation loop",
    paybackMonths: 6.0,
  },
  {
    id: "chemicals",
    name: "Specialty Chemicals & Distillation",
    cluster: "Ankleshwar, Gujarat",
    unit: "kg steam / kg product",
    low: 2.2,
    median: 2.9,
    high: 3.8,
    samplePlant: 4.3,
    primaryLeak: "Distillation column reflux ratio overshoot & steam trap blow-through",
    topLever: "Automated reflux optimization & thermodynamic steam traps",
    paybackMonths: 3.2,
  },
  {
    id: "paper",
    name: "Pulp & Kraft Paper Recycling",
    cluster: "Vapi, Gujarat",
    unit: "kWh / t paper produced",
    low: 340,
    median: 420,
    high: 510,
    samplePlant: 545,
    primaryLeak: "Hydrapulper rotor wear & drying cylinder condensate build-up",
    topLever: "Multi-stage stationary siphon upgrade & IE4 pulper drive",
    paybackMonths: 4.8,
  },
  {
    id: "auto",
    name: "Auto Ancillary & Forging",
    cluster: "Chennai / Pune Corridor",
    unit: "liters FO / t forged part",
    low: 75,
    median: 95,
    high: 120,
    samplePlant: 132,
    primaryLeak: "Slot furnace radiation losses & unshielded forging hammer dies",
    topLever: "Fiber ceramic lining & optical pyrometer burner control",
    paybackMonths: 5.5,
  },
];

export default function LandingBenchmarkExplorer() {
  const [selectedSector, setSelectedSector] = useState(SECTORS[0]);

  return (
    <section className="story-section" id="benchmarks" style={{ paddingTop: "60px" }}>
      <div className="story-header" style={{ marginBottom: "40px" }}>
        <div className="story-chapter-tag" style={{ color: "#38bdf8" }}>
          <Award size={13} />
          <span>Bureau of Energy Efficiency (BEE) MSME Cluster Data</span>
        </div>
        <h2 className="story-title">
          8 Sectoral Benchmarks.<br />
          <span className="landing-editorial" style={{ color: "#38bdf8" }}>
            Calibrated on real Indian industrial clusters.
          </span>
        </h2>
        <p className="story-sub">
          PRANGARA comes pre-calibrated with verified cluster baseline datasets surveyed under national energy efficiency programs.
          Select any sector below to inspect cluster ranges and benchmark leak triggers:
        </p>
      </div>

      {/* Sector Pill Tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginBottom: "36px" }}>
        {SECTORS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedSector(s)}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              background: selectedSector.id === s.id ? "#ffffff" : "rgba(255, 255, 255, 0.04)",
              color: selectedSector.id === s.id ? "#070809" : "#94a3b8",
              border: `1px solid ${selectedSector.id === s.id ? "#ffffff" : "rgba(255, 255, 255, 0.08)"}`,
              fontWeight: selectedSector.id === s.id ? 700 : 500,
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Selected Benchmark Detail Stage */}
      <div className="story-card-stage" style={{ background: "rgba(12, 16, 22, 0.9)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "36px", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#64748b", marginBottom: "6px" }}>
              CLUSTER REGION: {selectedSector.cluster}
            </div>
            <h3 style={{ fontSize: "28px", color: "#ffffff", marginBottom: "14px" }}>{selectedSector.name}</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
              Standard unit of measurement: <strong style={{ color: "#e2e8f0" }}>{selectedSector.unit}</strong>.
              Facilities in this cluster are evaluated against statistically trimmed interquartile ranges.
            </p>

            {/* Benchmark Track Visualization */}
            <div style={{ margin: "24px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "8px" }}>
                <span>Reported Efficient Range</span>
                <span style={{ color: "#f87171", fontWeight: 700 }}>
                  Breach Delta: +{selectedSector.samplePlant - selectedSector.median} {selectedSector.unit.split(" ")[0]}
                </span>
              </div>
              <div className="benchmark-bar-track" style={{ height: "14px" }}>
                <div className="benchmark-range-highlight" style={{ left: "20%", width: "50%" }} />
                <div className="benchmark-pin" style={{ left: "82%" }}>
                  <div className="benchmark-pin-bubble">
                    Plant: {selectedSector.samplePlant}
                  </div>
                  <div className="benchmark-pin-line" />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "12px" }}>
                <span>p10 Low: {selectedSector.low}</span>
                <span style={{ color: "#34d399", fontWeight: 600 }}>p50 Median: {selectedSector.median}</span>
                <span>p90 Threshold: {selectedSector.high}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <Link to="/assessment" className="landing-btn landing-btn-secondary" style={{ fontSize: "12px" }}>
                <span>Run Assessment Against this Cluster</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          {/* Sector Diagnostic Breakdown Card */}
          <div className="viz-panel" style={{ background: "rgba(18, 22, 30, 0.7)" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#38bdf8", fontWeight: 700, marginBottom: "16px" }}>
              Sector Decarbonization Intelligence
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(248, 113, 113, 0.08)", border: "1px solid rgba(248, 113, 113, 0.2)" }}>
                <div style={{ fontSize: "11px", color: "#f87171", fontWeight: 700, marginBottom: "4px" }}>MOST PREVALENT LEAK POINT</div>
                <div style={{ fontSize: "13px", color: "#e2e8f0" }}>{selectedSector.primaryLeak}</div>
              </div>

              <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(52, 211, 153, 0.08)", border: "1px solid rgba(52, 211, 153, 0.2)" }}>
                <div style={{ fontSize: "11px", color: "#34d399", fontWeight: 700, marginBottom: "4px" }}>HIGHEST NPV ABATEMENT LEVER</div>
                <div style={{ fontSize: "13px", color: "#e2e8f0" }}>{selectedSector.topLever}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>Average Capex Payback:</span>
                <strong style={{ fontSize: "15px", color: "#ffffff" }}>{selectedSector.paybackMonths} Months</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
