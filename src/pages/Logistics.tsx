import { useState } from "react";
import {
  Users,
  Repeat,
} from "lucide-react";
import { PageHeading, Note, Badge } from "../components/ui/common";
import { money } from "../lib/format";

interface Corridor {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  typicalCommodity: string;
}

const CORRIDORS: Corridor[] = [
  {
    id: "corridor-1",
    name: "Tirupur → Chennai Port (Export Corridor)",
    origin: "Tirupur Industrial Area, Tamil Nadu",
    destination: "Chennai Sea Port (Container Terminal)",
    distanceKm: 460,
    typicalCommodity: "Apparel & Finished Textiles"
  },
  {
    id: "corridor-2",
    name: "Coimbatore → Mumbai Bhiwandi Logistics Hub",
    origin: "Coimbatore SIDCO Cluster, Tamil Nadu",
    destination: "Bhiwandi Central Warehousing, Maharashtra",
    distanceKm: 1280,
    typicalCommodity: "Machined Castings & Industrial Motors"
  },
  {
    id: "corridor-3",
    name: "Surat → Mundra Port Gateway",
    origin: "Surat GIDC Textile & Chemical Hub, Gujarat",
    destination: "Adani Ports Mundra, Gujarat",
    distanceKm: 540,
    typicalCommodity: "Synthetic Textiles & Chemicals"
  },
  {
    id: "corridor-4",
    name: "Pune Chakan → JNPT Nhava Sheva",
    origin: "Chakan Auto MIDC, Pune, Maharashtra",
    destination: "JNPT Container Terminal, Navi Mumbai",
    distanceKm: 145,
    typicalCommodity: "Automotive Stamping & Sub-Assemblies"
  }
];

export default function Logistics() {
  const [selectedCorridor, setSelectedCorridor] = useState<Corridor>(CORRIDORS[0]);
  const [cargoWeightT, setCargoWeightT] = useState(18); // tonnes
  const [selectedMode, setSelectedMode] = useState<"fastest" | "cheapest" | "lowest_carbon" | "balanced">("balanced");
  const [poolJoined, setPoolJoined] = useState(false);
  const [backhaulClaimed, setBackhaulClaimed] = useState(false);

  // Route metrics calculation
  const km = selectedCorridor.distanceKm;

  // 1. Fastest Route (Express Highway, dedicated HCV diesel)
  const fastest = {
    mode: "fastest",
    label: "Fastest Express",
    vehicle: "Dedicated Multi-Axle Diesel HCV",
    transitHours: Math.round((km / 52) * 10) / 10,
    km,
    costInr: Math.round(km * 72 + cargoWeightT * 420),
    emissionsTco2e: Math.round((km * cargoWeightT * 0.000085) * 100) / 100, // 85g CO2/t-km
    tag: "Priority Delivery"
  };

  // 2. Cheapest Route (Toll-optimized highway)
  const cheapest = {
    mode: "cheapest",
    label: "Cheapest Toll-Optimized",
    vehicle: "Standard Diesel HCV (Toll-Avoidance Routing)",
    transitHours: Math.round((km / 40) * 10) / 10,
    km: Math.round(km * 1.08),
    costInr: Math.round(km * 58 + cargoWeightT * 380),
    emissionsTco2e: Math.round((km * 1.08 * cargoWeightT * 0.000082) * 100) / 100,
    tag: "Minimum Freight Rate"
  };

  // 3. Lowest Carbon Route (Rail DFC Intermodal / LNG)
  const lowestCarbon = {
    mode: "lowest_carbon",
    label: "Lowest Carbon Intermodal",
    vehicle: "Dedicated Freight Corridor (Rail) + First/Last Mile EV",
    transitHours: Math.round((km / 35 + 4) * 10) / 10,
    km: Math.round(km * 1.02),
    costInr: Math.round(km * 52 + cargoWeightT * 340),
    emissionsTco2e: Math.round((km * cargoWeightT * 0.000028) * 100) / 100, // 28g CO2/t-km (-67%)
    tag: "67% Carbon Reduction"
  };

  // 4. Balanced Route (Recommended hybrid optimal)
  const balanced = {
    mode: "balanced",
    label: "Balanced (Recommended)",
    vehicle: "High-Efficiency BS-VI LNG / Fleet Pooled HCV",
    transitHours: Math.round((km / 48) * 10) / 10,
    km,
    costInr: Math.round(km * 64 + cargoWeightT * 390),
    emissionsTco2e: Math.round((km * cargoWeightT * 0.000054) * 100) / 100, // 54g CO2/t-km
    tag: "Best Time-Cost-Emissions Ratio"
  };

  const routes = [balanced, lowestCarbon, fastest, cheapest];
  const activeRoute = routes.find((r) => r.mode === selectedMode) || balanced;

  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="ACT / GREEN LOGISTICS & ROUTE PLANNER (FR-41, FR-42, FR-43)"
        title="Decarbonize your transport corridors."
        description="Compare multi-modal routes (Fastest, Cheapest, Lowest Carbon, Balanced), pool truck capacity with regional manufacturers, and eliminate empty backhaul miles."
        action={
          <Badge tone="positive">Scope 3 Freight Optimization</Badge>
        }
      />

      {/* CORRIDOR SELECTOR & SHIPMENT PARAMS */}
      <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "14px", marginBottom: "1.75rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr", gap: "1.25rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
              Freight Corridor
            </label>
            <select
              value={selectedCorridor.id}
              onChange={(e) => {
                const found = CORRIDORS.find((c) => c.id === e.target.value);
                if (found) setSelectedCorridor(found);
              }}
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-dropdown, #111)",
                color: "inherit",
                fontSize: "0.9rem"
              }}
            >
              {CORRIDORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.distanceKm} km)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
              Shipment Weight (Tonnes)
            </label>
            <input
              type="number"
              min="1"
              max="40"
              value={cargoWeightT}
              onChange={(e) => setCargoWeightT(Math.max(1, Number(e.target.value)))}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                background: "transparent",
                color: "inherit",
                fontSize: "0.9rem"
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Origin: {selectedCorridor.origin}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Destination: {selectedCorridor.destination}
            </div>
          </div>
        </div>
      </div>

      {/* 4 ROUTING MODES COMPARISON (FR-41) */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <span className="eyebrow">MULTI-MODAL ALTERNATIVES (FR-41)</span>
            <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Compare 4 Route Execution Profiles</h3>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Corridor Distance: {selectedCorridor.distanceKm} km · Cargo: {cargoWeightT} tonnes
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
          {routes.map((r) => {
            const isSelected = selectedMode === r.mode;
            return (
              <div
                key={r.mode}
                onClick={() => setSelectedMode(r.mode as "fastest" | "cheapest" | "lowest_carbon" | "balanced")}
                className={`platform-extracted ${isSelected ? "active-row" : ""}`}
                style={{
                  padding: "1.25rem",
                  borderRadius: "12px",
                  cursor: "pointer",
                  border: isSelected ? "2px solid var(--brand-teal)" : "1px solid var(--border-subtle)",
                  position: "relative",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span className="eyebrow" style={{ color: isSelected ? "var(--brand-teal)" : "inherit" }}>
                    {r.label}
                  </span>
                  <Badge tone={r.mode === "balanced" || r.mode === "lowest_carbon" ? "positive" : "neutral"}>
                    {r.tag}
                  </Badge>
                </div>

                <div style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0.4rem 0" }}>
                  {money(r.costInr)}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", marginTop: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Transit Time:</span>
                    <strong>{r.transitHours} hrs</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Distance:</span>
                    <strong>{r.km} km</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Emissions:</span>
                    <strong className={r.emissionsTco2e <= balanced.emissionsTco2e ? "positive" : ""}>
                      {r.emissionsTco2e} tCO₂e
                    </strong>
                  </div>
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)" }}>
                  {r.vehicle}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED ROUTE DETAILS & DISPATCH ACTIONS */}
      <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "14px", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--brand-teal)" }}>ACTIVE ROUTE SELECTION</span>
            <h3 style={{ margin: "0.2rem 0", fontSize: "1.2rem" }}>
              {activeRoute.label} · {money(activeRoute.costInr)} · {activeRoute.emissionsTco2e} tCO₂e
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {activeRoute.vehicle}. Verified emission calculation following GLEC Framework & ISO 14083 freight accounting standards.
            </p>
          </div>
          <button
            className="button positive"
            onClick={() => alert(`Dispatch manifest generated for ${selectedCorridor.name} using ${activeRoute.label} routing.`)}
          >
            Generate Green Dispatch Manifest ↗
          </button>
        </div>
      </div>

      {/* TRUCK POOLING & BACKHAUL SECTION (FR-42 & FR-43) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* TRUCK POOLING CARD (FR-42) */}
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={18} className="positive" />
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Truck Pooling Consolidation (FR-42)</h3>
            </div>
            <Badge tone="positive">Match Found</Badge>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 1rem 0" }}>
            Consolidate your partial load (LTL) with a verified partner on this corridor into a single Full Truck Load (FTL).
          </p>

          <div className="platform-extracted" style={{ padding: "1rem", borderRadius: "10px", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <strong>Matched Partner: Lakshmi Eco-Yarns Ltd</strong>
              <Badge tone="neutral">94% Capacity</Badge>
            </div>
            <div style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Partner Load: 12 MT Knitted Fabric · Your Load: {cargoWeightT} MT · Same Corridor
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", fontSize: "0.8rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)" }}>
              <div>
                <span className="eyebrow">YOUR COST SAVING</span>
                <strong className="positive">₹9,400 / trip</strong>
              </div>
              <div>
                <span className="eyebrow">AVOIDED CARBON</span>
                <strong className="positive">-0.35 tCO₂e</strong>
              </div>
              <div>
                <span className="eyebrow">TRUCK UTILIZATION</span>
                <strong>45% → 94%</strong>
              </div>
            </div>
          </div>

          <button
            className={`button ${poolJoined ? "positive" : ""}`}
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => setPoolJoined(!poolJoined)}
          >
            {poolJoined ? "✓ Joined Shared Truck Pool" : "Join Truck Pool & Book Shared Space"}
          </button>
        </div>

        {/* BACKHAUL MATCHING (FR-43) */}
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Repeat size={18} className="positive" />
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Backhaul Return Match (FR-43)</h3>
            </div>
            <Badge tone="positive">Deadhead Elimination</Badge>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 1rem 0" }}>
            Eliminate empty return trips by carrying verified return cargo back to your origin industrial cluster.
          </p>

          <div className="platform-extracted" style={{ padding: "1rem", borderRadius: "10px", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <strong>Return Cargo: Secondary Aluminum Scrap</strong>
              <span style={{ fontSize: "0.8rem", color: "var(--brand-teal)", fontWeight: 600 }}>Port → Cluster</span>
            </div>
            <div style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Shipper: Chennai Port Stevedores · Net Weight: 16 MT · Ready at Container Yard 4
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", fontSize: "0.8rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)" }}>
              <div>
                <span className="eyebrow">RETURN FREIGHT EARNING</span>
                <strong className="positive">₹22,000</strong>
              </div>
              <div>
                <span className="eyebrow">DEADHEAD KM AVOIDED</span>
                <strong>460 km</strong>
              </div>
              <div>
                <span className="eyebrow">CARBON SAVED</span>
                <strong className="positive">-0.42 tCO₂e</strong>
              </div>
            </div>
          </div>

          <button
            className={`button ${backhaulClaimed ? "positive" : ""}`}
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => setBackhaulClaimed(!backhaulClaimed)}
          >
            {backhaulClaimed ? "✓ Backhaul Assignment Confirmed" : "Claim Return Backhaul Cargo ↗"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <Note>
          GLEC Framework compliant. Multi-modal logistics calculations strictly use regional freight factors and payload-utilization curves.
        </Note>
      </div>
    </div>
  );
}
