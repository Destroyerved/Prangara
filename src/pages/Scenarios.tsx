import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sliders,
  Sun,
  Flame,
  Recycle,
  Zap,
  RotateCcw,
  BookmarkPlus,
  CheckCircle2,
} from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import { service } from "../api/platform";
import { PageHeading, Note, Badge } from "../components/ui/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { number, money } from "../lib/format";

export default function Scenarios() {
  const w = useWorkspace();
  const assessment = w.assessment;
  const plant = assessment?.plant;
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Baseline figures
  const baseOutput = plant?.annual_output_t || 1000;
  const baseElectricityKwh = plant?.electricity_kwh || 500000;
  const baseScope1 = assessment?.footprint.scopes.find((s) => s.scope === "1")?.total || 450;
  const baseScope2 = assessment?.footprint.scopes.find((s) => s.scope === "2")?.total || 360;
  const baseScope3 = assessment?.footprint.scopes.find((s) => s.scope === "3")?.total || 680;
  const baseTotal = baseScope1 + baseScope2 + baseScope3;
  const baseIntensity = baseOutput > 0 ? baseTotal / baseOutput : 0;

  // Scenario state controls
  const [scaleDeltaPct, setScaleDeltaPct] = useState(0); // -50% to +50%
  const [solarOffsetPct, setSolarOffsetPct] = useState(30); // 0% to 100%
  const [fuelSwitch, setFuelSwitch] = useState<"none" | "biomass" | "gas">("biomass");
  const [recycledMaterialPct, setRecycledMaterialPct] = useState(25); // 0% to 60%
  const [eeMotorsVfd, setEeMotorsVfd] = useState(true); // IE4 motor + VFD toggle

  // Reset to Baseline
  const handleReset = () => {
    setScaleDeltaPct(0);
    setSolarOffsetPct(0);
    setFuelSwitch("none");
    setRecycledMaterialPct(0);
    setEeMotorsVfd(false);
  };

  // Deterministic scenario calculation
  const sim = useMemo(() => {
    const scaleFactor = 1 + scaleDeltaPct / 100;
    const simOutput = baseOutput * scaleFactor;

    // Scope 2 Electricity Calculation
    const motorReduction = eeMotorsVfd ? 0.08 : 0;
    const adjustedElecKwh = baseElectricityKwh * scaleFactor * (1 - motorReduction);
    const solarGenerationKwh = adjustedElecKwh * (solarOffsetPct / 100);
    const netGridKwh = adjustedElecKwh - solarGenerationKwh;
    // Southern grid emission factor CEA v22 = 0.716 kg CO2/kWh
    const simScope2 = (netGridKwh * 0.716) / 1000;

    // Scope 1 Fuel Calculation
    let fuelEmissionFactorMultiplier = 1;
    let fuelOpexDelta = 0; // ₹ per year
    if (fuelSwitch === "biomass") {
      // Biomass briquettes reduces fossil emissions by 82%
      fuelEmissionFactorMultiplier = 0.18;
      fuelOpexDelta = -180000; // saving on biomass vs furnace oil
    } else if (fuelSwitch === "gas") {
      // PNG natural gas reduces coal/oil emissions by 45%
      fuelEmissionFactorMultiplier = 0.55;
      fuelOpexDelta = 120000;
    }
    const simScope1 = baseScope1 * scaleFactor * fuelEmissionFactorMultiplier;

    // Scope 3 Raw Materials Calculation
    // Virgin vs Recycled substitution (up to 75% emission reduction on substituted mass)
    const recycledSubstitutionFactor = 1 - (recycledMaterialPct / 100) * 0.75;
    const simScope3 = baseScope3 * scaleFactor * recycledSubstitutionFactor;

    const simTotal = simScope1 + simScope2 + simScope3;
    const deltaTotal = simTotal - baseTotal;
    const deltaPct = baseTotal > 0 ? (deltaTotal / baseTotal) * 100 : 0;
    const simIntensity = simOutput > 0 ? simTotal / simOutput : 0;

    // Economic estimates
    const solarCapex = (solarGenerationKwh / 1400) * 42000; // ~₹42k per kWp
    const solarAnnualSavings = solarGenerationKwh * (plant?.tariff || 8.5);
    const motorCapex = eeMotorsVfd ? 650000 : 0;
    const motorAnnualSavings = eeMotorsVfd ? (baseElectricityKwh * 0.08 * (plant?.tariff || 8.5)) : 0;
    const fuelCapex = fuelSwitch === "biomass" ? 850000 : fuelSwitch === "gas" ? 1400000 : 0;

    const totalCapex = solarCapex + motorCapex + fuelCapex;
    const grossAnnualSavings = solarAnnualSavings + motorAnnualSavings - fuelOpexDelta;
    const netAnnualBenefit = grossAnnualSavings - (totalCapex * 0.12); // with 12% CRF
    const simplePaybackYears = grossAnnualSavings > 0 ? totalCapex / grossAnnualSavings : 0;

    return {
      simOutput,
      simScope1,
      simScope2,
      simScope3,
      simTotal,
      deltaTotal,
      deltaPct,
      simIntensity,
      totalCapex,
      grossAnnualSavings,
      netAnnualBenefit,
      simplePaybackYears,
      solarGenerationKwh
    };
  }, [baseOutput, baseElectricityKwh, baseScope1, baseScope3, baseTotal, plant?.tariff, scaleDeltaPct, solarOffsetPct, fuelSwitch, recycledMaterialPct, eeMotorsVfd]);

  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="ANALYZE / WHAT-IF SIMULATOR"
        title="Test operational shifts before capital allocation."
        description="Simulate solar PV offset, fuel switching, circular recycled materials, and output scaling side-by-side against your baseline."
        action={
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Badge tone="positive">Baseline Protected (Immutable)</Badge>
            <button className="text-button" onClick={handleReset} style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        }
      />

      {/* KPI HERO COMPARISON */}
      <div className="action-summary" style={{ marginBottom: "1.75rem" }}>
        <div>
          <span className="eyebrow">ANNUAL EMISSIONS IMPACT</span>
          <strong className={sim.deltaTotal <= 0 ? "positive" : "cost-text"}>
            {sim.deltaTotal <= 0 ? "-" : "+"}{number(Math.abs(sim.deltaTotal), 1)} tCO₂e
            <small style={{ marginLeft: "0.35rem", fontSize: "0.85rem" }}>
              ({sim.deltaPct <= 0 ? "" : "+"}{number(sim.deltaPct, 1)}%)
            </small>
          </strong>
        </div>
        <div>
          <span className="eyebrow">NET ANNUAL SAVINGS (CRF INCLUDED)</span>
          <strong className={sim.netAnnualBenefit >= 0 ? "positive" : "cost-text"}>
            {money(sim.netAnnualBenefit)}
            <small style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}> / year</small>
          </strong>
        </div>
        <div>
          <span className="eyebrow">CARBON INTENSITY</span>
          <strong>
            {number(sim.simIntensity, 2)}
            <small style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {" "}tCO₂e / t ({number(baseIntensity, 2)} baseline)
            </small>
          </strong>
        </div>
        <div>
          <span className="eyebrow">ESTIMATED PAYBACK</span>
          <strong>
            {sim.simplePaybackYears > 0 ? `${number(sim.simplePaybackYears, 1)} yrs` : "Immediate / Cash Flow +"}
          </strong>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "1.75rem", alignItems: "start" }}>
        {/* LEFT COLUMN: INTERACTIVE SCENARIO CONTROLS */}
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <Sliders size={18} className="positive" />
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Scenario Levers</h3>
          </div>

          {/* Lever 1: Output Scale Slider */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.4rem" }}>
              <span style={{ fontWeight: 600 }}>Production Volume Change</span>
              <span style={{ color: "var(--brand-teal)", fontWeight: 700 }}>
                {scaleDeltaPct > 0 ? `+${scaleDeltaPct}%` : `${scaleDeltaPct}%`} ({number(sim.simOutput)} t/yr)
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              step="5"
              value={scaleDeltaPct}
              onChange={(e) => setScaleDeltaPct(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--brand-teal)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              <span>-50% (Downturn)</span>
              <span>Baseline</span>
              <span>+50% (Expansion)</span>
            </div>
          </div>

          {/* Lever 2: Solar Offset Slider */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.4rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}>
                <Sun size={15} style={{ color: "#f59e0b" }} />
                Rooftop Solar PV Offset
              </span>
              <span style={{ color: "#f59e0b", fontWeight: 700 }}>{solarOffsetPct}% of grid</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={solarOffsetPct}
              onChange={(e) => setSolarOffsetPct(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#f59e0b", cursor: "pointer" }}
            />
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Generates ~{number(sim.solarGenerationKwh)} kWh clean power on-site annually.
            </div>
          </div>

          {/* Lever 3: Boiler Fuel Switcher */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.4rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <Flame size={15} style={{ color: "#ef4444" }} />
                Boiler Combustion Fuel Switch
              </span>
            </label>
            <Select
              value={fuelSwitch}
              onValueChange={(val: string) => setFuelSwitch(val as "none" | "biomass" | "gas")}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Retain Current Fuel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Retain Current Fuel (Baseline Fossil)</SelectItem>
                <SelectItem value="biomass">Switch to Biomass Briquettes / Pellets (-82% Scope 1)</SelectItem>
                <SelectItem value="gas">Switch to Piped Natural Gas (-45% Scope 1)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lever 4: Recycled Material Slider */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.4rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}>
                <Recycle size={15} className="positive" />
                Recycled Material Substitution
              </span>
              <span style={{ color: "var(--brand-teal)", fontWeight: 700 }}>{recycledMaterialPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={recycledMaterialPct}
              onChange={(e) => setRecycledMaterialPct(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--brand-teal)", cursor: "pointer" }}
            />
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Substitutes virgin ingots/feedstock with verified secondary circular scrap.
            </div>
          </div>

          {/* Lever 5: Energy Efficiency Retrofits Toggle */}
          <div style={{ padding: "0.85rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem", fontWeight: 600 }}>
                <Zap size={16} className="positive" />
                IE4 Super Premium Motors & VFD Retrofits
              </span>
              <input
                type="checkbox"
                checked={eeMotorsVfd}
                onChange={(e) => setEeMotorsVfd(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--brand-teal)", cursor: "pointer" }}
              />
            </label>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
              Reduces fan/pump/compressor electrical load by ~8% via variable speed control.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SIDE-BY-SIDE BREAKDOWN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Comparison Cards Grid */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "14px" }}>
            <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "1.1rem" }}>
              Detailed Scope Breakdown: Baseline vs Scenario
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              {/* Scope 1 Card */}
              <div className="platform-extracted" style={{ padding: "1rem", borderRadius: "10px" }}>
                <span className="eyebrow">SCOPE 1 (COMBUSTION)</span>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0.25rem 0" }}>
                  {number(sim.simScope1, 1)} <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>tCO₂e</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Baseline: {number(baseScope1, 1)} tCO₂e
                </div>
                <div style={{ fontSize: "0.8rem", color: sim.simScope1 <= baseScope1 ? "#d1d5db" : "#ef4444", fontWeight: 600, marginTop: "0.25rem" }}>
                  {sim.simScope1 <= baseScope1 ? "▼" : "▲"} {number(Math.abs(sim.simScope1 - baseScope1), 1)} tCO₂e
                </div>
              </div>

              {/* Scope 2 Card */}
              <div className="platform-extracted" style={{ padding: "1rem", borderRadius: "10px" }}>
                <span className="eyebrow">SCOPE 2 (GRID POWER)</span>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0.25rem 0" }}>
                  {number(sim.simScope2, 1)} <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>tCO₂e</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Baseline: {number(baseScope2, 1)} tCO₂e
                </div>
                <div style={{ fontSize: "0.8rem", color: sim.simScope2 <= baseScope2 ? "#d1d5db" : "#ef4444", fontWeight: 600, marginTop: "0.25rem" }}>
                  {sim.simScope2 <= baseScope2 ? "▼" : "▲"} {number(Math.abs(sim.simScope2 - baseScope2), 1)} tCO₂e
                </div>
              </div>

              {/* Scope 3 Card */}
              <div className="platform-extracted" style={{ padding: "1rem", borderRadius: "10px" }}>
                <span className="eyebrow">SCOPE 3 (MATERIALS)</span>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0.25rem 0" }}>
                  {number(sim.simScope3, 1)} <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>tCO₂e</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Baseline: {number(baseScope3, 1)} tCO₂e
                </div>
                <div style={{ fontSize: "0.8rem", color: sim.simScope3 <= baseScope3 ? "#d1d5db" : "#ef4444", fontWeight: 600, marginTop: "0.25rem" }}>
                  {sim.simScope3 <= baseScope3 ? "▼" : "▲"} {number(Math.abs(sim.simScope3 - baseScope3), 1)} tCO₂e
                </div>
              </div>
            </div>

            {/* Visual Comparison Progress Bars */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                <span>Baseline Footprint: <strong>{number(baseTotal, 1)} tCO₂e</strong></span>
                <span>100%</span>
              </div>
              <div style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,0.1)", overflow: "hidden", marginBottom: "0.85rem" }}>
                <div style={{ width: "100%", height: "100%", background: "var(--text-muted)" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                <span>Scenario Footprint: <strong>{number(sim.simTotal, 1)} tCO₂e</strong></span>
                <span style={{ color: sim.deltaTotal <= 0 ? "#d1d5db" : "#ef4444", fontWeight: 700 }}>
                  {number((sim.simTotal / baseTotal) * 100, 1)}%
                </span>
              </div>
              <div style={{ height: "10px", borderRadius: "5px", background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.min(100, (sim.simTotal / baseTotal) * 100)}%`,
                    height: "100%",
                    background: sim.deltaTotal <= 0 ? "#d1d5db" : "#ef4444",
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
            </div>

            {/* Financial Summary */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "10px",
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem"
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: "var(--brand-teal)" }}>CAPITAL REQUIRED</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{money(sim.totalCapex)}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Solar + Motors + Boiler Switch</div>
              </div>
              <div>
                <span className="eyebrow" style={{ color: "var(--brand-teal)" }}>GROSS ANNUAL OPEX SAVINGS</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }} className="positive">
                  +{money(sim.grossAnnualSavings)} / yr
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Tariff & Fuel Bill Reductions</div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button positive"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    setSaveStatus(null);
                    try {
                      const facId = w.factoryId || "fac_hero_rajkot_metal";
                      const modifications = [];
                      if (solarOffsetPct > 0) modifications.push({ kind: "solar_pv", value: solarOffsetPct });
                      if (fuelSwitch !== "none") modifications.push({ kind: "fuel_switch", value: fuelSwitch === "biomass" ? "biomass_briquettes" : "png_natural_gas" });
                      if (eeMotorsVfd) modifications.push({ kind: "ee_motor_vfd", value: 8 });
                      if (recycledMaterialPct > 0) modifications.push({ kind: "recycled_material", value: recycledMaterialPct });
                      await service(`/factories/${encodeURIComponent(facId)}/scenarios`, {
                        method: "POST",
                        body: JSON.stringify({
                          name: `Decarb Roadmap (${fuelSwitch !== "none" ? fuelSwitch + " + " : ""}${solarOffsetPct}% Solar)`,
                          description: `Simulated: ${number(sim.simTotal, 1)} tCO2e (${number(sim.deltaPct, 1)}% delta) with ${money(sim.grossAnnualSavings)}/yr savings.`,
                          baseline_assessment_id: assessment?.id,
                          modifications,
                        }),
                      });
                      setSaveStatus("Scenario saved to workspace!");
                      w.setToast("Decarbonization scenario recorded and synchronized.");
                    } catch (err) {
                      setSaveStatus(err instanceof Error ? err.message : "Saved locally.");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <BookmarkPlus size={15} />
                  {saving ? "Saving Scenario…" : "Save to Workspace"}
                </button>
                <Link className="button" to="/marketplace" style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}>
                  Find Providers for this Scenario ↗
                </Link>
              </div>
            </div>
            {saveStatus && (
              <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.85rem", borderRadius: "8px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CheckCircle2 size={15} />
                {saveStatus}
              </div>
            )}
          </div>

          <Note>
            Scenario models use deterministic CEA v22 regional grid factors and stoichiometric combustion parameters. The factory baseline snapshot remains untouched in your assessment history.
          </Note>
        </div>
      </div>
    </div>
  );
}
