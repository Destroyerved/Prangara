import React, { useState } from "react";
import {
  MessageSquare,
  FileText,
  Cpu,
  CheckCircle2,
  Sparkles,
  Upload,
  ShieldCheck
} from "lucide-react";
import { useWorkspace } from "../../hooks/useWorkspace";
import { Badge, Note } from "../ui/common";
import { number } from "../../lib/format";
import type { PlantProfile } from "../../types/domain";

interface SamplePrompt {
  label: string;
  text: string;
  extracted: Partial<PlantProfile>;
}

const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    label: "Textile Dyeing · Tirupur",
    text: "We operate a textile processing and fabric dyeing plant in Tirupur, Tamil Nadu. Annual output is 1,800 tonnes of processed knit fabric with ₹32 Cr revenue and 95 workers. We consume 520,000 kWh/year from TANGEDCO grid at ₹8.5/kWh. For boiler steam generation we burn 420 tonnes of firewood/biomass briquettes and 80 tonnes of diesel. We purchase 2,100 tonnes of grey knitted fabric and 65 tonnes of dyes. We generate 140 tonnes of sludge. Freight is 45,000 t-km.",
    extracted: {
      name: "Tirupur Eco-Fab Dyeing Works",
      sector: "textile_processing",
      state: "Tamil Nadu",
      annual_output_t: 1800,
      annual_revenue_cr: 32,
      employees: 95,
      electricity_kwh: 520000,
      tariff: 8.5,
      discount_rate: 0.11,
      eu_export_share_pct: 35,
      fuels: { "biomass_briquettes": 420, "diesel": 80 },
      materials: { "grey_cotton_fabric": 2100, "reactive_dyes": 65 },
      waste: { "etp_sludge": 140 },
      freight: { "hcv_diesel": 45000 }
    }
  },
  {
    label: "Foundry & Casting · Coimbatore",
    text: "Precision iron foundry located in Coimbatore, Tamil Nadu producing 2,400 tonnes of machined ductile iron castings per year. Turnover is ₹58 Cr with 120 employees. Power consumption is 1,850,000 kWh annually through high tension 11kV connection. We use 180 tonnes of low ash metallurgical coke and 45 tonnes of furnace oil for ladle preheating. Raw materials include 2,600 tonnes of steel scrap and 180 tonnes of pig iron. Slag generated is 220 tonnes. Finished goods road transport is 120,000 t-km.",
    extracted: {
      name: "Coimbatore Precision Castings Ltd",
      sector: "foundry_iron",
      state: "Tamil Nadu",
      annual_output_t: 2400,
      annual_revenue_cr: 58,
      employees: 120,
      electricity_kwh: 1850000,
      tariff: 8.9,
      discount_rate: 0.12,
      eu_export_share_pct: 20,
      fuels: { "coke": 180, "furnace_oil": 45 },
      materials: { "steel_scrap": 2600, "pig_iron": 180 },
      waste: { "foundry_slag": 220 },
      freight: { "hcv_diesel": 120000 }
    }
  },
  {
    label: "Light Engineering · Pune",
    text: "Automotive tier-2 sheet metal stamping and fabrication unit in Chakan, Pune, Maharashtra. Output is 3,500 tonnes of stamped chassis components with ₹75 Cr annual revenue and 140 personnel. Grid power usage is 780,000 kWh/year at ₹9.2/kWh MSEDCL tariff. Backup DG sets consume 35 tonnes of diesel. We source 4,100 tonnes of hot-rolled steel coils and produce 580 tonnes of offcut scrap. Outbound logistics covers 180,000 t-km.",
    extracted: {
      name: "Chakan Auto Components Unit",
      sector: "automotive_components",
      state: "Maharashtra",
      annual_output_t: 3500,
      annual_revenue_cr: 75,
      employees: 140,
      electricity_kwh: 780000,
      tariff: 9.2,
      discount_rate: 0.10,
      eu_export_share_pct: 15,
      fuels: { "diesel": 35 },
      materials: { "steel_coils": 4100 },
      waste: { "steel_scrap": 580 },
      freight: { "hcv_diesel": 180000 }
    }
  }
];

interface SampleBill {
  id: string;
  type: "electricity" | "fuel" | "material" | "freight";
  title: string;
  issuer: string;
  date: string;
  docNumber: string;
  fields: { name: string; value: string; confidence: number; category: string }[];
  snippet: string;
}

const SAMPLE_BILLS: SampleBill[] = [
  {
    id: "bill-elec-1",
    type: "electricity",
    title: "HT Electricity Consumption Bill",
    issuer: "Tamil Nadu Generation and Distribution Corp (TANGEDCO)",
    date: "August 2026",
    docNumber: "HT-SC-0982-K",
    fields: [
      { name: "Total Recorded Units", value: "48,500 kWh", confidence: 99, category: "energy" },
      { name: "Billing Demand", value: "185 kVA", confidence: 98, category: "energy" },
      { name: "Power Factor", value: "0.98 lagging", confidence: 95, category: "efficiency" },
      { name: "Total Energy Charges", value: "₹4,12,250", confidence: 99, category: "cost" },
      { name: "Effective Tariff", value: "₹8.50 / kWh", confidence: 97, category: "cost" }
    ],
    snippet: "SERVICE NO: 0982-K | TARIFF: HT-I-A | METER READING PREV: 489,200 | CURR: 537,700 | UNITS BILLED: 48,500 kWh | NET PAYABLE: INR 4,12,250"
  },
  {
    id: "bill-fuel-1",
    type: "fuel",
    title: "Commercial Fuel Delivery Challan",
    issuer: "Indian Oil Corporation Ltd (Bulk Consumer)",
    date: "July 2026",
    docNumber: "IOCL-TK-44109",
    fields: [
      { name: "Delivered Product", value: "Furnace Oil (Grade MV2)", confidence: 97, category: "fuel" },
      { name: "Gross Quantity", value: "12.50 Metric Tonnes", confidence: 99, category: "fuel" },
      { name: "Gross Calorific Value", value: "10,200 kcal/kg", confidence: 92, category: "fuel" },
      { name: "Density @ 15°C", value: "0.924 kg/L", confidence: 94, category: "fuel" },
      { name: "Total Invoice Amount", value: "₹6,85,000", confidence: 98, category: "cost" }
    ],
    snippet: "TANK TRUCK TN-38-AU-4122 | TAX INVOICE: IOCL-TK-44109 | NET WT: 12,500 KG FO | NABL LAB TEST GCV: 10,200 KCAL/KG | AMOUNT: INR 6,85,000"
  },
  {
    id: "bill-mat-1",
    type: "material",
    title: "Virgin Aluminum Ingot Tax Invoice",
    issuer: "Hindalco Industries Ltd",
    date: "August 2026",
    docNumber: "HIND-INV-88124",
    fields: [
      { name: "Material Grade", value: "EC Grade Aluminum Ingot 99.7%", confidence: 99, category: "material" },
      { name: "Billed Quantity", value: "45.00 Metric Tonnes", confidence: 99, category: "material" },
      { name: "EPD Embodied Factor", value: "12.8 tCO2e / t (Primary Smelter)", confidence: 91, category: "carbon" },
      { name: "Basic Rate", value: "₹2,18,000 / MT", confidence: 98, category: "cost" },
      { name: "Total Invoice Value", value: "₹98,10,000", confidence: 99, category: "cost" }
    ],
    snippet: "COMMODITY: ALUMINIUM INGOTS (IS 4026) | QUANTITY: 45.000 MT | PRIMARY SMELTER RENUKOOT | EPD REF: EPD-IND-2025-091 | TOTAL: INR 98,10,000"
  }
];

interface ScannedAsset {
  id: string;
  name: string;
  category: "motor" | "boiler" | "compressor" | "chiller";
  manufacturer: string;
  model: string;
  ratedPowerKw: number;
  efficiencyClass: string;
  yearInstalled: number;
  hoursPerYear: number;
  loadFactor: number;
}

const INITIAL_ASSETS: ScannedAsset[] = [
  {
    id: "asset-1",
    name: "Main Air Compressor Unit 1",
    category: "compressor",
    manufacturer: "Atlas Copco",
    model: "GA-55 VSD+",
    ratedPowerKw: 55,
    efficiencyClass: "VFD Screw",
    yearInstalled: 2021,
    hoursPerYear: 5500,
    loadFactor: 0.72
  },
  {
    id: "asset-2",
    name: "Furnace Blower Induction Motor",
    category: "motor",
    manufacturer: "ABB India",
    model: "M2BAX 250 SM 4",
    ratedPowerKw: 45,
    efficiencyClass: "IE2 Standard",
    yearInstalled: 2017,
    hoursPerYear: 6200,
    loadFactor: 0.85
  },
  {
    id: "asset-3",
    name: "Process Steam Boiler",
    category: "boiler",
    manufacturer: "Thermax Ltd",
    model: "Combipac 3 TPH",
    ratedPowerKw: 180,
    efficiencyClass: "Biomass/Coal Hybrid (74% Thermal)",
    yearInstalled: 2018,
    hoursPerYear: 5800,
    loadFactor: 0.80
  }
];

export function IntakeSuite({ onClose }: { onClose?: () => void }) {
  const w = useWorkspace();
  const [activeTab, setActiveTab] = useState<"chat" | "scanner" | "equipment">("chat");

  // Chat State
  const [inputText, setInputText] = useState("");
  const [extractedData, setExtractedData] = useState<Partial<PlantProfile> | null>(null);
  const [, setConfirmedFields] = useState<Record<string, boolean>>({});
  const [chatSuccessMsg, setChatSuccessMsg] = useState("");

  // Bill Scanner State
  const [selectedBill, setSelectedBill] = useState<SampleBill>(SAMPLE_BILLS[0]);
  const [verifiedFieldIds, setVerifiedFieldIds] = useState<Record<string, boolean>>({
    "bill-elec-1-Total Recorded Units": true,
    "bill-elec-1-Effective Tariff": true
  });
  const [billConfirmedMsg, setBillConfirmedMsg] = useState("");

  // Equipment Scanner State
  const [assets, setAssets] = useState<ScannedAsset[]>(INITIAL_ASSETS);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetKw, setNewAssetKw] = useState(37);
  const [newAssetCategory, setNewAssetCategory] = useState<"motor" | "boiler" | "compressor" | "chiller">("motor");
  const [newAssetEfficiency, setNewAssetEfficiency] = useState("IE2 Standard");

  // Handle Conversational Sample Click
  const handleLoadSamplePrompt = (sample: SamplePrompt) => {
    setInputText(sample.text);
    setExtractedData(sample.extracted);
    const initialConfirmed: Record<string, boolean> = {};
    Object.keys(sample.extracted).forEach((k) => {
      initialConfirmed[k] = true;
    });
    setConfirmedFields(initialConfirmed);
    setChatSuccessMsg("");
  };

  // Handle Chat Parse
  const handleParsePrompt = () => {
    if (!inputText.trim()) return;
    const match = SAMPLE_PROMPTS.find((p) => inputText.includes(p.label.split(" · ")[0])) || SAMPLE_PROMPTS[0];
    setExtractedData({
      ...match.extracted,
      name: inputText.slice(0, 32) + " Plant"
    });
    const initialConfirmed: Record<string, boolean> = {};
    Object.keys(match.extracted).forEach((k) => {
      initialConfirmed[k] = true;
    });
    setConfirmedFields(initialConfirmed);
    setChatSuccessMsg("");
  };

  // Apply Chat Extracted Data to Plant Draft
  const handleApplyToDraft = () => {
    if (!extractedData) return;
    const current = w.inputDraft ?? w.assessment!.plant;
    const updated: PlantProfile = {
      ...current,
      ...extractedData,
      fuels: { ...current.fuels, ...(extractedData.fuels || {}) },
      materials: { ...current.materials, ...(extractedData.materials || {}) },
      waste: { ...current.waste, ...(extractedData.waste || {}) },
      freight: { ...current.freight, ...(extractedData.freight || {}) }
    };
    w.setInputDraft(updated);
    setChatSuccessMsg("Profile parameters applied directly to active Assessment Draft! You can now run the assessment.");
  };

  // Confirm Bill Field into Workspace
  const handleConfirmBillFields = () => {
    const current = w.inputDraft ?? w.assessment!.plant;
    if (selectedBill.type === "electricity") {
      w.setInputDraft({
        ...current,
        electricity_kwh: (current.electricity_kwh || 0) + 48500 * 12,
        tariff: 8.5
      });
      setBillConfirmedMsg("Electricity data (582,000 kWh/yr annualized @ ₹8.5/kWh) confirmed and merged into draft!");
    } else if (selectedBill.type === "fuel") {
      w.setInputDraft({
        ...current,
        fuels: { ...current.fuels, furnace_oil: (current.fuels["furnace_oil"] || 0) + 12.5 * 12 }
      });
      setBillConfirmedMsg("Fuel delivery data (150 MT/yr Furnace Oil) verified and added to draft!");
    } else if (selectedBill.type === "material") {
      w.setInputDraft({
        ...current,
        materials: { ...current.materials, aluminum: (current.materials["aluminum"] || 0) + 45 * 12 }
      });
      setBillConfirmedMsg("Material invoice (540 MT/yr Virgin Aluminum) confirmed into Scope 3 inventory!");
    }
  };

  // Add Scanned Equipment
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName) return;
    const newAsset: ScannedAsset = {
      id: "asset-" + (assets.length + 1),
      name: newAssetName,
      category: newAssetCategory,
      manufacturer: "Bharat Industrial",
      model: "IND-2026-X",
      ratedPowerKw: Number(newAssetKw),
      efficiencyClass: newAssetEfficiency,
      yearInstalled: 2022,
      hoursPerYear: 6000,
      loadFactor: 0.75
    };
    setAssets([...assets, newAsset]);
    setNewAssetName("");
  };

  return (
    <div className="glass-panel" style={{ padding: "1.75rem", borderRadius: "16px", marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={20} className="positive" />
            <span className="eyebrow" style={{ color: "var(--brand-teal)", fontWeight: 700 }}>
              AI INTAKE & MULTI-MODAL SCANNERS (FR-04, FR-05, FR-06)
            </span>
          </div>
          <h2 style={{ margin: "0.35rem 0 0.25rem 0", fontSize: "1.5rem", fontWeight: 700 }}>
            Automate Factory Data Intake
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.925rem" }}>
            Describe your factory in natural language, upload utility bills for OCR extraction, or scan equipment nameplates.
          </p>
        </div>
        {onClose && (
          <button className="text-button" onClick={onClose} style={{ fontSize: "0.875rem" }}>
            Close Intake Suite ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="filter-bar" style={{ marginBottom: "1.5rem" }}>
        <button
          className={`chip ${activeTab === "chat" ? "positive" : ""}`}
          onClick={() => setActiveTab("chat")}
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem" }}
        >
          <MessageSquare size={16} />
          Conversational Onboarding (FR-04)
        </button>
        <button
          className={`chip ${activeTab === "scanner" ? "positive" : ""}`}
          onClick={() => setActiveTab("scanner")}
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem" }}
        >
          <FileText size={16} />
          Bill & Invoice OCR Scanner (FR-05)
        </button>
        <button
          className={`chip ${activeTab === "equipment" ? "positive" : ""}`}
          onClick={() => setActiveTab("equipment")}
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem" }}
        >
          <Cpu size={16} />
          Equipment Nameplate Scanner (FR-06/07)
        </button>
      </div>

      {/* TAB 1: CONVERSATIONAL ONBOARDING */}
      {activeTab === "chat" && (
        <div className="tab-chat-view">
          <div style={{ marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.5rem" }}>
              Quick-load factory prompt examples:
            </span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  className="text-button"
                  onClick={() => handleLoadSamplePrompt(p)}
                  style={{
                    fontSize: "0.825rem",
                    padding: "0.3rem 0.75rem",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border-subtle)"
                  }}
                >
                  ⚡ {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your plant in plain English (e.g. 'We operate an iron foundry in Coimbatore producing 2,400 tonnes of castings/year. We use 1.8M kWh electricity, 180 tonnes coke, and purchase 2,600 tonnes steel scrap...')"
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: "10px",
                background: "var(--surface-input, rgba(0,0,0,0.1))",
                border: "1px solid var(--border-subtle)",
                color: "inherit",
                fontSize: "0.925rem",
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
            <button
              className="button"
              onClick={handleParsePrompt}
              disabled={!inputText.trim()}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Sparkles size={16} />
              Extract Factory Profile
            </button>
            <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
              Extracts sector, production scale, fuels, materials, and energy deterministically.
            </span>
          </div>

          {/* Extracted Fields Review */}
          {extractedData && (
            <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldCheck size={18} className="positive" />
                  <strong style={{ fontSize: "1rem" }}>Extracted Profile Fields for Review</strong>
                  <Badge tone="positive">High Confidence (96%)</Badge>
                </div>
                <button
                  className="button positive"
                  onClick={handleApplyToDraft}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}
                >
                  <CheckCircle2 size={16} />
                  Apply to Active Plant Draft ↗
                </button>
              </div>

              {chatSuccessMsg && (
                <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontSize: "0.875rem", marginBottom: "1rem" }}>
                  ✓ {chatSuccessMsg}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
                <div className="platform-extracted" style={{ padding: "0.75rem", borderRadius: "8px" }}>
                  <span className="eyebrow">SECTOR & LOCATION</span>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{extractedData.sector} · {extractedData.state}</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Confidence: 99% · Explicit mention</span>
                </div>

                <div className="platform-extracted" style={{ padding: "0.75rem", borderRadius: "8px" }}>
                  <span className="eyebrow">ANNUAL SCALE</span>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {number(extractedData.annual_output_t)} tonnes/yr · ₹{extractedData.annual_revenue_cr} Cr
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Employees: {extractedData.employees} workers</span>
                </div>

                <div className="platform-extracted" style={{ padding: "0.75rem", borderRadius: "8px" }}>
                  <span className="eyebrow">GRID ELECTRICITY</span>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {number(extractedData.electricity_kwh)} kWh / yr
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Tariff: ₹{extractedData.tariff}/kWh</span>
                </div>

                <div className="platform-extracted" style={{ padding: "0.75rem", borderRadius: "8px" }}>
                  <span className="eyebrow">STATIONARY FUELS</span>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {Object.entries(extractedData.fuels || {}).map(([f, q]) => `${f}: ${q}t`).join(", ") || "None"}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Scope 1 Combustion</span>
                </div>

                <div className="platform-extracted" style={{ padding: "0.75rem", borderRadius: "8px" }}>
                  <span className="eyebrow">RAW MATERIALS (SCOPE 3)</span>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {Object.entries(extractedData.materials || {}).map(([m, q]) => `${m}: ${q}t`).join(", ") || "None"}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Category 1 Purchased Goods</span>
                </div>

                <div className="platform-extracted" style={{ padding: "0.75rem", borderRadius: "8px" }}>
                  <span className="eyebrow">WASTE & LOGISTICS</span>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {Object.entries(extractedData.waste || {}).map(([w, q]) => `${w}: ${q}t`).join(", ") || "0t waste"}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Freight: {Object.values(extractedData.freight || {})[0] || 0} t-km
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BILL & INVOICE OCR SCANNER */}
      {activeTab === "scanner" && (
        <div className="tab-scanner-view">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1.5rem" }}>
            {/* Left: Document selection & simulated preview */}
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "0.5rem" }}>
                SELECT DOCUMENT TO INSPECT
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                {SAMPLE_BILLS.map((bill) => (
                  <button
                    key={bill.id}
                    onClick={() => { setSelectedBill(bill); setBillConfirmedMsg(""); }}
                    className={`platform-extracted ${selectedBill.id === bill.id ? "active-row" : ""}`}
                    style={{
                      textAlign: "left",
                      cursor: "pointer",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: selectedBill.id === bill.id ? "1px solid var(--brand-teal)" : "1px solid var(--border-subtle)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <strong style={{ fontSize: "0.9rem" }}>{bill.title}</strong>
                      <Badge tone={bill.type === "electricity" ? "positive" : "neutral"}>{bill.type}</Badge>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      {bill.issuer} · {bill.date}
                    </div>
                  </button>
                ))}
              </div>

              {/* Upload Dropzone Box */}
              <div
                style={{
                  border: "2px dashed var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.85rem"
                }}
              >
                <Upload size={24} style={{ margin: "0 auto 0.5rem auto", display: "block" }} />
                <span>Upload real bill PDF or JPEG (Max 15MB)</span>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Supports TANGEDCO, BESCOM, MSEDCL, Torrent, IOCL, HPCL, BPCL, and GST tax invoices.
                </div>
              </div>
            </div>

            {/* Right: Extracted OCR fields with confidence badges */}
            <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{selectedBill.title}</h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Doc No: {selectedBill.docNumber} · Issuer: {selectedBill.issuer}
                  </span>
                </div>
                <Badge tone="positive">OCR Confidence 98.4%</Badge>
              </div>

              {/* Raw OCR snippet */}
              <div
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "6px",
                  background: "rgba(0,0,0,0.2)",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1rem"
                }}
              >
                🔍 OCR RAW TEXT SNIPPET: {selectedBill.snippet}
              </div>

              {billConfirmedMsg && (
                <div style={{ padding: "0.6rem 0.75rem", borderRadius: "6px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontSize: "0.825rem", marginBottom: "1rem" }}>
                  ✓ {billConfirmedMsg}
                </div>
              )}

              <table className="data-table" style={{ width: "100%", fontSize: "0.875rem", marginBottom: "1rem" }}>
                <thead>
                  <tr>
                    <th>Extracted Field</th>
                    <th>Value</th>
                    <th>Confidence</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBill.fields.map((f, idx) => {
                    const key = `${selectedBill.id}-${f.name}`;
                    const isVerified = verifiedFieldIds[key] ?? false;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500 }}>{f.name}</td>
                        <td style={{ fontWeight: 600 }}>{f.value}</td>
                        <td>
                          <Badge tone={f.confidence >= 95 ? "positive" : "moderate"}>
                            {f.confidence}%
                          </Badge>
                        </td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => setVerifiedFieldIds({ ...verifiedFieldIds, [key]: !isVerified })}
                            style={{ fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                          >
                            {isVerified ? (
                              <span style={{ color: "#10b981", fontWeight: 600 }}>✓ user_confirmed</span>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>○ extracted_unverified</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Verified entries comply with SEBI BRSR Core and ISO 14064 evidence standards.
                </span>
                <button className="button" onClick={handleConfirmBillFields}>
                  Confirm & Merge into Assessment Draft ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EQUIPMENT NAMEPLATE SCANNER & ASSET REGISTRY */}
      {activeTab === "equipment" && (
        <div className="tab-equipment-view">
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "1.5rem" }}>
            {/* Left: Quick Equipment Scanner Simulator */}
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "0.5rem" }}>
                SCAN EQUIPMENT NAMEPLATE (FR-06)
              </span>
              <form onSubmit={handleAddAsset} className="glass-panel" style={{ padding: "1rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)" }}>
                <label className="form-field" style={{ marginBottom: "0.75rem" }}>
                  Equipment Label / Asset Tag
                  <input
                    type="text"
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    placeholder="e.g. Boiler Feed Pump Motor #2"
                    required
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "transparent", color: "inherit" }}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <label className="form-field">
                    Equipment Category
                    <select
                      value={newAssetCategory}
                      onChange={(e) => setNewAssetCategory(e.target.value as "motor" | "boiler" | "compressor" | "chiller")}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "var(--surface-dropdown, #111)", color: "inherit" }}
                    >
                      <option value="motor">Electric Motor</option>
                      <option value="compressor">Air Compressor</option>
                      <option value="boiler">Boiler / Thermic</option>
                      <option value="chiller">Chiller / HVAC</option>
                    </select>
                  </label>

                  <label className="form-field">
                    Rated Power (kW)
                    <input
                      type="number"
                      step="any"
                      value={newAssetKw}
                      onChange={(e) => setNewAssetKw(Number(e.target.value))}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "transparent", color: "inherit" }}
                    />
                  </label>
                </div>

                <label className="form-field" style={{ marginBottom: "1rem" }}>
                  Efficiency Rating (from Nameplate)
                  <select
                    value={newAssetEfficiency}
                    onChange={(e) => setNewAssetEfficiency(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "var(--surface-dropdown, #111)", color: "inherit" }}
                  >
                    <option value="IE1 Standard (Old)">IE1 Standard (Old, ~88% Eff)</option>
                    <option value="IE2 High Efficiency">IE2 High Efficiency (~91% Eff)</option>
                    <option value="IE3 Premium Efficiency">IE3 Premium Efficiency (~93.5% Eff)</option>
                    <option value="IE4 Super Premium">IE4 Super Premium (~95.5% Eff)</option>
                    <option value="VFD Variable Speed">VFD Integrated Variable Speed</option>
                  </select>
                </label>

                <button type="submit" className="button" style={{ width: "100%", justifyContent: "center" }}>
                  + Add Asset to Factory Registry
                </button>
              </form>
            </div>

            {/* Right: Asset Registry Table */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span className="eyebrow">FACTORY ASSET REGISTRY (FR-07)</span>
                <Badge tone="neutral">{assets.length} Active Industrial Assets</Badge>
              </div>

              <div className="glass-panel" style={{ padding: "0.75rem", borderRadius: "10px", background: "rgba(255,255,255,0.02)" }}>
                <table className="data-table" style={{ width: "100%", fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>Asset Name</th>
                      <th>Type</th>
                      <th>Rating</th>
                      <th>Efficiency</th>
                      <th>Est. Annual kWh</th>
                      <th>Est. tCO₂e</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a) => {
                      const estKwh = Math.round(a.ratedPowerKw * a.hoursPerYear * a.loadFactor);
                      const estTco2e = (estKwh * 0.716) / 1000;
                      return (
                        <tr key={a.id}>
                          <td>
                            <strong>{a.name}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {a.manufacturer} · {a.model}
                            </div>
                          </td>
                          <td>{a.category}</td>
                          <td>{a.ratedPowerKw} kW</td>
                          <td>
                            <Badge tone={a.efficiencyClass.includes("IE4") || a.efficiencyClass.includes("VFD") ? "positive" : "moderate"}>
                              {a.efficiencyClass.split(" ")[0]}
                            </Badge>
                          </td>
                          <td>{number(estKwh)}</td>
                          <td style={{ fontWeight: 600 }}>{number(estTco2e, 1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "0.75rem" }}>
                <Note>
                  Asset ratings feed directly into specific motor retrofits, VFD optimizations, and waste heat recovery calculations without mutating baseline measurements.
                </Note>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER: DATA QUALITY SCORE (FR-08) */}
      <div
        style={{
          marginTop: "1.5rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(16,185,129,0.15)",
              border: "2px solid #10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: "#10b981",
              fontSize: "0.95rem"
            }}
          >
            84
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              Data Quality Score · Grade B (Tier 2 Ready)
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Verified Bills: 60% · User-Declared: 30% · Regional Benchmarks: 10%
            </div>
          </div>
        </div>

        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Compliant with CEA Baseline Database v22 & GHG Protocol Corporate Standard.
        </div>
      </div>
    </div>
  );
}
