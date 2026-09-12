/**
 * Network and corridor reference content.
 *
 * Ported verbatim from the web app's `CircularNetwork` and `Logistics` pages so
 * the two surfaces describe the same clusters, the same listings and the same
 * freight corridors. These are illustrative cluster listings, labelled as such
 * wherever they are shown; the route figures beside them come from the
 * backend's logistics service, never from here.
 */

export interface SymbiosisMatch {
  id: string;
  material: string;
  category: 'ash_slag' | 'solvent' | 'textile' | 'biomass';
  generator: string;
  cluster: string;
  annualQtyT: number;
  pricePerTInr: number;
  suitableApplications: string[];
  specs: string;
  avoidedEmissionsPerT: number;
  certifications: string;
}

export interface SharedCapacityListing {
  id: string;
  title: string;
  assetType: 'furnace' | 'boiler' | 'coating' | 'chiller' | 'machining';
  ownerFactory: string;
  cluster: string;
  availableCapacity: string;
  availabilityWindow: string;
  rate: string;
  specifications: string;
}

export interface Corridor {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  typicalCommodity: string;
  originGps: [number, number];
  destinationGps: [number, number];
}

export const SYMBIOSIS_LISTINGS: SymbiosisMatch[] = [
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

export const CAPACITY_LISTINGS: SharedCapacityListing[] = [
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

export const CORRIDORS: Corridor[] = [
  {
    id: "corridor-1",
    originGps: [11.1085, 77.3411],
    destinationGps: [13.0827, 80.2707],
    name: "Tirupur → Chennai Port (Export Corridor)",
    origin: "Tirupur Industrial Area, Tamil Nadu",
    destination: "Chennai Sea Port (Container Terminal)",
    distanceKm: 460,
    typicalCommodity: "Apparel & Finished Textiles"
  },
  {
    id: "corridor-2",
    originGps: [11.0168, 76.9558],
    destinationGps: [19.2813, 73.0483],
    name: "Coimbatore → Mumbai Bhiwandi Logistics Hub",
    origin: "Coimbatore SIDCO Cluster, Tamil Nadu",
    destination: "Bhiwandi Central Warehousing, Maharashtra",
    distanceKm: 1280,
    typicalCommodity: "Machined Castings & Industrial Motors"
  },
  {
    id: "corridor-3",
    originGps: [21.1702, 72.8311],
    destinationGps: [22.8394, 69.7219],
    name: "Surat → Mundra Port Gateway",
    origin: "Surat GIDC Textile & Chemical Hub, Gujarat",
    destination: "Adani Ports Mundra, Gujarat",
    distanceKm: 540,
    typicalCommodity: "Synthetic Textiles & Chemicals"
  },
  {
    id: "corridor-4",
    originGps: [18.7606, 73.8636],
    destinationGps: [18.9490, 72.9525],
    name: "Pune Chakan → JNPT Nhava Sheva",
    origin: "Chakan Auto MIDC, Pune, Maharashtra",
    destination: "JNPT Container Terminal, Navi Mumbai",
    distanceKm: 145,
    typicalCommodity: "Automotive Stamping & Sub-Assemblies"
  }
];
