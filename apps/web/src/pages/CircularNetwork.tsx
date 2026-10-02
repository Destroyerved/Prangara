import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Share2,
  Recycle,
  MapPin,
} from "lucide-react";
import { PageHeading, Note, Badge, SearchBox } from "../components/ui/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { number, money } from "../lib/format";
import { SleekIndustrialMap } from "../components/maps/SleekIndustrialMap";

interface SymbiosisMatch {
  id: string;
  material: string;
  category: "ash_slag" | "solvent" | "textile" | "biomass";
  generator: string;
  cluster: string;
  annualQtyT: number;
  pricePerTInr: number;
  suitableApplications: string[];
  specs: string;
  avoidedEmissionsPerT: number; // tCO2e / t
  certifications: string;
}

const SYMBIOSIS_LISTINGS: SymbiosisMatch[] = [
  {
    id: "sym-1",
    material: "Comber Noil (100% Cotton Short Staple)",
    category: "textile",
    generator: "Premier Spinning Mills Ltd",
    cluster: "Tirupur - Coimbatore Textile Corridor",
    annualQtyT: 340,
    pricePerTInr: 92000,
    suitableApplications: ["Open-End Coarse Rotor Yarn (10s/20s)", "Absorbent Surgical Cotton", "Paper Pulp Blending"],
    specs: "Trash content < 4.5% · Moisture < 7.8% · Unbleached natural staple",
    avoidedEmissionsPerT: 1.95,
    certifications: "Global Recycled Standard (GRS) Verified"
  },
  {
    id: "sym-2",
    material: "Class-F High Calcium Fly Ash",
    category: "ash_slag",
    generator: "Captive Industrial Co-generation Plant",
    cluster: "Tuticorin Energy Belt, Tamil Nadu",
    annualQtyT: 4800,
    pricePerTInr: 850,
    suitableApplications: ["Pozzolanic Cement Replacement (up to 35%)", "AAC Lightweight Building Blocks", "Geopolymer Concrete"],
    specs: "Fineness > 340 m²/kg · Loss on Ignition < 2.5% · Dry silo conditioned",
    avoidedEmissionsPerT: 0.82,
    certifications: "BIS IS 3812 Part 1 Compliant"
  },
  {
    id: "sym-3",
    material: "Spent Isopropyl Alcohol (Technical IPA 84%)",
    category: "solvent",
    generator: "Bulk Drug Pharma Formulation Unit",
    cluster: "Jeedimetla Pharma Cluster, Hyderabad",
    annualQtyT: 180,
    pricePerTInr: 38000,
    suitableApplications: ["Fractional Distillation Reclamation (Re-purified to 99.5%)", "Industrial Degreaser Solvent", "Paint Thinner Formulation"],
    specs: "Purity 84.2% · Non-halogenated · Free of heavy metal residues",
    avoidedEmissionsPerT: 1.65,
    certifications: "Form 10 Hazardous Waste Manifest Compliant"
  },
  {
    id: "sym-4",
    material: "Crushed Foundry Cupola Slag",
    category: "ash_slag",
    generator: "Coimbatore Ductile Iron Foundry Consortium",
    cluster: "Coimbatore Industrial Estate, Tamil Nadu",
    annualQtyT: 1200,
    pricePerTInr: 620,
    suitableApplications: ["Rigid Pavement Sub-base", "Ready Mix Concrete Coarse Aggregate Replacement", "Bituminous Road Surfacing"],
    specs: "Crushed 10mm-20mm · Los Angeles Abrasion < 24% · Non-expansive",
    avoidedEmissionsPerT: 0.45,
    certifications: "IRC Road Construction Technical Approval"
  },
  {
    id: "sym-5",
    material: "Sugarcane Bagasse Agro-Residue Pellets",
    category: "biomass",
    generator: "Kalyani Bio-Sugar Complex",
    cluster: "Kolhapur - Belgaum Sugar Belt",
    annualQtyT: 3200,
    pricePerTInr: 5800,
    suitableApplications: ["Industrial Boiler Fuel (Direct Coal Substitute)", "Thermic Fluid Heater Firing", "Biomass Gasification"],
    specs: "GCV: 3,850 kcal/kg · Moisture < 9% · Ash content < 4.2%",
    avoidedEmissionsPerT: 1.42,
    certifications: "NABL Calorific Test Certified"
  }
];

interface SharedCapacityListing {
  id: string;
  title: string;
  assetType: "furnace" | "boiler" | "coating" | "chiller" | "machining";
  ownerFactory: string;
  cluster: string;
  availableCapacity: string;
  availabilityWindow: string;
  rate: string;
  specifications: string;
}

const CAPACITY_LISTINGS: SharedCapacityListing[] = [
  {
    id: "cap-1",
    title: "250 kW Controlled Atmosphere Annealing Furnace",
    assetType: "furnace",
    ownerFactory: "Precision Heat Treaters Ltd",
    cluster: "Coimbatore SIDCO Industrial Estate",
    availableCapacity: "Up to 40 MT / week (Idle 36 hrs)",
    availabilityWindow: "Friday evening to Monday morning",
    rate: "₹2,400 / furnace operating hour",
    specifications: "Working volume: 2.2m × 1.5m × 1.2m · Max Temp 1050°C · Nitrogen purge atmosphere"
  },
  {
    id: "cap-2",
    title: "4 TPH Saturated Steam Boiler (Surplus Offtake)",
    assetType: "boiler",
    ownerFactory: "Sundaram Bio-Processing Works",
    cluster: "SIPCOT Industrial Complex, Perundurai",
    availableCapacity: "1.5 TPH continuous spare steam",
    availabilityWindow: "24×7 continuous off-peak availability",
    rate: "₹1.45 per kg steam delivered at fence-line",
    specifications: "Steam pressure 10.5 bar · 100% biomass fired (Low carbon steam)"
  },
  {
    id: "cap-3",
    title: "Automated Conveyorized Powder Coating Line",
    assetType: "coating",
    ownerFactory: "Apex Metal Finishers",
    cluster: "Bhosari MIDC, Pune, Maharashtra",
    availableCapacity: "12,000 sq.ft / day unutilized track capacity",
    availabilityWindow: "Night shifts (8:00 PM to 6:00 AM)",
    rate: "₹8.50 / sq.ft processed",
    specifications: "7-tank zinc phosphating pretreatment · Wagner automatic reciprocators · 220°C oven"
  },
  {
    id: "cap-4",
    title: "High-Capacity 50 MT Controlled Atmosphere Cold Store",
    assetType: "chiller",
    ownerFactory: "Gujarat Agri-Cold Logistics",
    cluster: "Surat GIDC Belt",
    availableCapacity: "25 MT spare refrigerated pallet space",
    availabilityWindow: "Immediate flexible seasonal storage",
    rate: "₹180 / MT / day",
    specifications: "Temp range: 2°C to 8°C · Ammonia-free eco-refrigerant · Backup solar DG"
  }
];

const SYMBIOSIS_CLUSTERS = [
  { lat: 11.0500, lon: 77.1500, label: "Tirupur Textile Corridor", details: "Cotton Comber Noil & Recycled Yarns (Premier Spinning Mills)" },
  { lat: 8.7642, lon: 78.1348, label: "Tuticorin Energy Belt", details: "Class-F High Calcium Fly Ash (Captive Co-gen Plant)" },
  { lat: 17.5169, lon: 78.4727, label: "Jeedimetla Pharma Cluster", details: "Spent Isopropyl Alcohol 84% (Bulk Drug Formulation)" },
  { lat: 11.0168, lon: 76.9558, label: "Coimbatore Foundry Belt", details: "Crushed Cupola Slag & Thermal Sand (Consortium)" },
  { lat: 16.7050, lon: 74.2433, label: "Kolhapur-Belgaum Sugar Belt", details: "Sugarcane Bagasse Agro-Pellets (Kalyani Bio-Sugar)" },
  { lat: 18.6279, lon: 73.8447, label: "Bhosari MIDC Pune", details: "Conveyorized Powder Coating Line (Apex Metal Finishers)" },
  { lat: 21.1702, lon: 72.8311, label: "Surat GIDC Belt", details: "50 MT Controlled Atmosphere Cold Store (Agri-Logistics)" },
];

export default function CircularNetwork() {
  const [activeTab, setActiveTab] = useState<"symbiosis" | "capacity" | "map">("symbiosis");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [trialRequested, setTrialRequested] = useState<Record<string, boolean>>({});

  // Filtered Symbiosis
  const filteredSymbiosis = SYMBIOSIS_LISTINGS.filter((item) => {
    const matchSearch = item.material.toLowerCase().includes(search.toLowerCase()) || item.cluster.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // Filtered Capacity
  const filteredCapacity = CAPACITY_LISTINGS.filter((item) => {
    return item.title.toLowerCase().includes(search.toLowerCase()) || item.cluster.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="ACT / CIRCULAR NETWORK"
        title="Turn waste into feedstock and share idle capacity."
        description="Discover regional industrial symbiosis pairings, monetize underutilized factory machinery, and source circular secondary by-products."
        action={<Badge tone="positive">Industrial Symbiosis Ecosystem</Badge>}
      />

      {/* TABS */}
      <div className="filter-bar" style={{ marginBottom: "1.5rem" }}>
        <button
          className={`chip ${activeTab === "symbiosis" ? "positive" : ""}`}
          onClick={() => { setActiveTab("symbiosis"); setCategoryFilter("all"); }}
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1.1rem" }}
        >
          <Recycle size={16} />
          By-Product &amp; Symbiosis Exchange
        </button>
        <button
          className={`chip ${activeTab === "capacity" ? "positive" : ""}`}
          onClick={() => { setActiveTab("capacity"); setCategoryFilter("all"); }}
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1.1rem" }}
        >
          <Share2 size={16} />
          Shared Industrial Equipment Capacity
        </button>
        <button
          className={`chip ${activeTab === "map" ? "positive" : ""}`}
          onClick={() => setActiveTab("map")}
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1.1rem" }}
        >
          <MapPin size={16} />
          Regional Cluster Map (GPS)
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="filter-bar" style={{ marginBottom: "1.75rem" }}>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={activeTab === "symbiosis" ? "Search by-products (cotton, fly ash, slag, solvent…)" : "Search industrial equipment (furnace, boiler, chiller…)"}
        />

        {activeTab === "symbiosis" && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[220px] h-[39px]">
              <SelectValue placeholder="All Material Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Material Categories</SelectItem>
              <SelectItem value="textile">Textile & Fibers</SelectItem>
              <SelectItem value="ash_slag">Slag, Ash & Minerals</SelectItem>
              <SelectItem value="solvent">Chemicals & Solvents</SelectItem>
              <SelectItem value="biomass">Agro-Biomass Residues</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* TAB 1: BY-PRODUCT & INDUSTRIAL SYMBIOSIS EXCHANGE */}
      {activeTab === "symbiosis" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem" }}>
            {filteredSymbiosis.map((item) => {
              const isRequested = trialRequested[item.id] ?? false;
              const totalAnnualCarbonAvoided = Math.round(item.annualQtyT * item.avoidedEmissionsPerT);
              return (
                <div key={item.id} className="glass-panel" style={{ padding: "1.4rem", borderRadius: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <span className="eyebrow" style={{ color: "var(--brand-teal)" }}>
                        {item.category.toUpperCase().replace("_", " & ")}
                      </span>
                      <Badge tone="positive">-{item.avoidedEmissionsPerT} tCO₂e / t</Badge>
                    </div>

                    <h3 style={{ margin: "0.25rem 0", fontSize: "1.15rem" }}>{item.material}</h3>
                    <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                      {item.generator} · {item.cluster}
                    </div>

                    <div style={{ padding: "0.65rem 0.85rem", borderRadius: "8px", background: "rgba(255,255,255,0.03)", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.85rem" }}>
                      <strong>Technical Spec:</strong> {item.specs}
                    </div>

                    <div style={{ marginBottom: "0.85rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>
                        Suitable Downstream Applications:
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                        {item.suitableApplications.map((app, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              background: "rgba(16,185,129,0.08)",
                              border: "1px solid rgba(16,185,129,0.2)",
                              color: "var(--brand-teal)"
                            }}
                          >
                            • {app}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.825rem", padding: "0.75rem 0", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", marginBottom: "1rem" }}>
                      <div>
                        <span className="eyebrow">INDICATIVE RATE</span>
                        <strong>{money(item.pricePerTInr)} / tonne</strong>
                      </div>
                      <div>
                        <span className="eyebrow">AVAILABLE TONNAGE</span>
                        <strong>{number(item.annualQtyT)} tonnes / yr</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Avoids <strong>{number(totalAnnualCarbonAvoided)} tCO₂e/yr</strong> vs virgin feedstock.
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <button
                        className={`button ${isRequested ? "positive" : ""}`}
                        onClick={() => setTrialRequested({ ...trialRequested, [item.id]: !isRequested })}
                        style={{ fontSize: "0.825rem", padding: "0.4rem 0.85rem" }}
                      >
                        {isRequested ? "✓ Sample Requested" : "Request Trial ↗"}
                      </button>
                      <Link
                        to="/marketplace"
                        className="text-button"
                        style={{ fontSize: "0.8rem", textDecoration: "underline" }}
                      >
                        Source in Marketplace
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SHARED INDUSTRIAL EQUIPMENT CAPACITY */}
      {activeTab === "capacity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem" }}>
            {filteredCapacity.map((item) => {
              const isRequested = trialRequested[item.id] ?? false;
              return (
                <div key={item.id} className="glass-panel" style={{ padding: "1.4rem", borderRadius: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <span className="eyebrow" style={{ color: "var(--brand-teal)" }}>
                        {item.assetType.toUpperCase()}
                      </span>
                      <Badge tone="neutral">{item.availabilityWindow}</Badge>
                    </div>

                    <h3 style={{ margin: "0.25rem 0", fontSize: "1.15rem" }}>{item.title}</h3>
                    <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                      {item.ownerFactory} · {item.cluster}
                    </div>

                    <div style={{ padding: "0.65rem 0.85rem", borderRadius: "8px", background: "rgba(255,255,255,0.03)", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.85rem" }}>
                      <strong>Asset Parameters:</strong> {item.specifications}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.5rem", fontSize: "0.825rem", padding: "0.75rem 0", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", marginBottom: "1rem" }}>
                      <div>
                        <span className="eyebrow">SPARE CAPACITY</span>
                        <strong>{item.availableCapacity}</strong>
                      </div>
                      <div>
                        <span className="eyebrow">RATE BASIS</span>
                        <strong className="positive">{item.rate}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Eliminates cluster CAPEX redundancy.
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <button
                        className={`button ${isRequested ? "positive" : ""}`}
                        onClick={() => setTrialRequested({ ...trialRequested, [item.id]: !isRequested })}
                        style={{ fontSize: "0.825rem", padding: "0.4rem 0.85rem" }}
                      >
                        {isRequested ? "✓ Booking Inquired" : "Book Slot ↗"}
                      </button>
                      <Link
                        to="/marketplace"
                        className="text-button"
                        style={{ fontSize: "0.8rem", textDecoration: "underline" }}
                      >
                        Find Providers
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: REGIONAL CLUSTER SYMBIOSIS MAP (GPS) */}
      {activeTab === "map" && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--brand-teal, #79D7E6)" }}>GEOGRAPHIC INDUSTRIAL SYMBIOSIS</span>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Regional Cluster Material Exchange &amp; Shared Assets</h3>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Hover over circular nodes to inspect feedstock specifications &amp; proximity
            </div>
          </div>

          <SleekIndustrialMap
            corridorName="Regional Industrial Symbiosis Clusters"
            origin={{ lat: 11.0500, lon: 77.1500, label: "Tirupur-Coimbatore Textile Hub", details: "Cotton Comber Noil & Recycled Yarns" }}
            destination={{ lat: 8.7642, lon: 78.1348, label: "Tuticorin Energy Belt", details: "Class-F High Calcium Fly Ash" }}
            clusters={SYMBIOSIS_CLUSTERS}
            height={520}
          />

          {/* Quick Cluster Selector Cards below map */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginTop: "1.25rem" }}>
            {SYMBIOSIS_CLUSTERS.map((cl, i) => (
              <div
                key={i}
                className="glass-panel"
                style={{ padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                  <MapPin size={14} style={{ color: "var(--accent, #79D7E6)" }} />
                  <strong style={{ fontSize: "0.9rem" }}>{cl.label}</strong>
                </div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {cl.details}
                </p>
                <div style={{ marginTop: "0.6rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                    {cl.lat.toFixed(2)}° N, {cl.lon.toFixed(2)}° E
                  </span>
                  <Link
                    to="/marketplace"
                    className="text-button"
                    style={{ fontSize: "0.75rem", color: "var(--accent, #79D7E6)" }}
                  >
                    Source Materials ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "1.75rem" }}>
        <Note>
          Symbiosis pairings follow hazardous waste manifest rules (Form 10) and secondary raw material standards. Avoiding landfill disposal and duplicate capital equipment directly abates regional Scope 3 lifecycle footprints.
        </Note>
      </div>
    </div>
  );
}
