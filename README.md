<div align="center">

# ⚡ PRANGARA (प्रांगार)
### Industrial Carbon Intelligence & Autonomous Decarbonization Network

*HackOut'26 · Problem Statement PS10*  
**Industrial Emission Leak-Point Detector & Circular Alternative Recommender**

[![Node.js](https://img.shields.io/badge/Node.js-v24%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Tests](https://img.shields.io/badge/Automated%20Tests-72%2F72%20PASSING%20(100%25)-2ea44f?style=for-the-badge&logo=githubactions&logoColor=white)](#automated-test-verification)
[![Cryptographic Provenance](https://img.shields.io/badge/Data%20Sources-23%20SHA--256%20VERIFIED-007acc?style=for-the-badge&logo=security&logoColor=white)](#data-provenance--cryptographic-authenticity)
[![Runs Fully Offline](https://img.shields.io/badge/Runs-100%25%20Offline-6f42c1?style=for-the-badge)](#quick-start--test-execution)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br/>

> **"Lead with Rupees, Close with Tonnes."**  
> An Indian industrial SME enters 10 numbers it already possesses from monthly invoices.  
> **PRANGARA** outputs an audit-grade Scope 1, 2, and 3 footprint with uncertainty intervals, isolates exact peer-relative carbon leaks, and generates an optimized, cash-positive circular decarbonization roadmap.

---

</div>

## 📌 Table of Contents

- [The Core Challenge & Vision](#-the-core-challenge--vision)
- [Why PRANGARA is Not Just Another Calculator](#-why-prangara-is-not-just-another-calculator)
- [System Architecture (The Neuro-Symbolic Engine)](#-system-architecture-the-neuro-symbolic-engine)
- [Advanced ML & Operations Research Layer](#-advanced-ml--operations-research-layer)
- [10 Supported Industrial Sectors & Demo Plants](#-10-supported-industrial-sectors--demo-plants)
- [Hero Plant Case Study — Tirupur Dyeing Facility](#-hero-plant-case-study--tirupur-dyeing-facility)
- [Unified REST API Reference (Port 8080)](#-unified-rest-api-reference-port-8080)
- [Shared Contracts & DTOs (`packages/contracts/`)](#-shared-contracts--dtos-packagescontracts)
- [Quick Start & Test Execution](#-quick-start--test-execution)
- [Data Provenance & Cryptographic Authenticity](#-data-provenance--cryptographic-authenticity)
- [Repository Structure](#-repository-structure)

---

## 🎯 The Core Challenge & Vision

India is home to over **63 million Micro, Small, and Medium Enterprises (MSMEs)** powering global manufacturing. Today, these factories face sudden commercial deadlines:
1. **EU CBAM (Carbon Border Adjustment Mechanism):** Definitive tariff regime active since January 2026. Non-compliant steel, aluminium, and textile exporters face punitive export penalties.
2. **SEBI BRSR Core:** Mandates top 1,000 listed Indian corporations to audit the Scope 3 emissions of their value chain suppliers.
3. **Green Finance Lending Covenants:** Banks and NBFCs require verifiable emissions baselines for concessionary loan rates.

### The MSME Reality
- **Invisible Carbon:** Factory owners assume their boiler is their only emission source. In reality, **60% to 70% of an SME's carbon is embedded in raw material purchases** (cotton yarn, billets, polymers) that never appear on electricity bills.
- **Generic Advice Fails:** Telling an MSME to "install solar" is useless without a financial business case. Telling them: *"₹2.17 Cr CapEx, 14-month payback, saves ₹82 Lakhs/yr, eliminates 367 tCO₂e/yr"* gets an immediate board decision.
- **Zero Hallucination Tolerance:** Carbon compliance is statutory. Banks and auditors reject generative AI estimations. Calculations must be **100% mathematically deterministic** under ISO 14064 and the GHG Protocol Corporate Standard.

---

## 💡 Why PRANGARA is Not Just Another Calculator

```
 ┌────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
 │   1. FACTORY INTAKE    │       │ 2. DETERMINISTIC CORE  │       │  3. ADVANCED ML & OR   │
 │ Direct Monthly Metrics │ ────> │  Scope 1/2/3 Inventory │ ────> │ Multi-Objective Pareto │
 │ 10 Simple Numbers      │       │  Peer-Relative Leaks   │       │ CVRPTW Truck Pooling   │
 └────────────────────────┘       └────────────────────────┘       └────────────────────────┘
                                                                               │
                                                                               ▼
 ┌────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
 │  6. STATUTORY AUDIT    │       │  5. VERIFIABLE RAG     │       │  4. CIRCULAR ACTIONS   │
 │ CBAM, CCTS & BRSR Core │ <──── │ SHA-256 Primary Badges │ <──── │ 30 Refusal-Constrained │
 │ High-Assurance Ready   │       │ CEA / DESNZ / IPCC / BEE│       │ Marginal Abatement MACC│
 └────────────────────────┘       └────────────────────────┘       └────────────────────────┘
```

1. **Benchmark-Relative Leak Detection:** A leak is not simply a big number — it is a number that is **larger than what peer factories achieve for the same product**. PRANGARA triggers three quantitative leak rules:
   - `Benchmark Breach`: Specific emissions exceeding the sector 75th percentile ($> p_{75}$).
   - `Material Concentration`: Streams contributing $> 15\%$ of total footprint while exceeding the sector median ($> p_{50}$).
   - `Structural Hotspot`: Severe upstream Scope 3 material vulnerabilities.
2. **Physical Engineering Refusal Rules:** Unlike generative models that hallucinate impossible advice, PRANGARA's recommender **refuses** invalid interventions:
   - Prohibits recycled blister foil in **GMP Pharmaceutical packaging** (patient safety violation).
   - Prohibits biomass briquettes in **Morbi Vitrified Tile kilns** (flue ash deposits ruin tile glaze finish).
   - Caps recycled cotton yarn at **25%** (fiber staple length shortens with recycling passes).
3. **Sequential Interaction De-Rating:** When 7 interventions target the same electricity meter, their savings are not purely additive. Each subsequent intervention only acts on the *remaining residual electricity load*, preventing double-counted carbon savings.
4. **Interval Uncertainty Arithmetic:** Factors carry statutory low, base, and high bounds (`Band [low, base, high]`). Headline results explicitly declare uncertainty:  
   *e.g., 24,069 tCO₂e (19,414 – 29,492, ±20.9%)*.
5. **Bayesian Data Flywheel:** Cluster efficiency averages evolve over time. Benchmarks dynamically shrink from published literature priors toward empirical measurements using an **Empirical Bayes shrinkage factor** of $n / (n + 8)$ with Interquartile Range (IQR) outlier filtering.

---

## 🔬 System Architecture: The Neuro-Symbolic Engine

PRANGARA splits its intelligence into two distinct, uncompromised layers:

```
                               PRANGARA ARCHITECTURE
  
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                    DETERMINISTIC SOVEREIGN CORE                             │
  │                  (Zero-Hallucination, ISO 14064)                            │
  │                                                                             │
  │  • Factor Registry       : CEA v22, DESNZ 2026, IPCC 2019, BEE              │
  │  • Process Streams       : Scope 1 (Direct), Scope 2 (Grid), Scope 3 (LCA)  │
  │  • Uncertainty Engine    : Strict interval bounds [low, base, high]         │
  │  • MACC Economics        : CRF CapEx, OpEx delta, LCOA (₹/tCO2e), Payback   │
  │  • Refusal Rules         : GMP Pharma, Ceramics, Food Processing caps       │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         │ Clean, Audited Mathematical Outputs
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                 ADVANCED ML & OPERATIONS RESEARCH LAYER                     │
  │                  (Constrained Decision Optimization)                        │
  │                                                                             │
  │  1. MILP Knapsack Solver : 5-Point Monotonic Pareto Optimal Frontier        │
  │  2. CVRPTW Freight Pool  : Google OR-Tools Multi-Tenant Truck Consolidation │
  │  3. Bayesian Benchmark   : Dynamic prior-to-posterior cluster learning      │
  │  4. Carbon-Delta Ranker  : Multi-attribute net carbon ROI with freight bias │
  │  5. Cryptographic RAG    : SHA-256 grounded statutory clause retrieval      │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Advanced ML & Operations Research Layer

### 1. Mixed-Integer Linear Programming (MILP) Portfolio Optimizer
- **Location:** [`backend/ml/portfolio_optimizer.js`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/backend/ml/portfolio_optimizer.js)
- **Problem:** Factory owners have tight budget caps and required payback periods. A naive greedy sort by LCOA fails under multi-meter interactions.
- **Solution:** Solves the 0/1 multi-objective knapsack problem:
  $$\max \sum_{i=1}^{N} \text{Abatement}_i \cdot x_i \quad \text{subject to} \quad \sum_{i=1}^{N} \text{Capex}_i \cdot x_i \le B, \quad \max_{i} (\text{Payback}_i \cdot x_i) \le T_{\max}$$
  Automatically computes a **5-point monotonic Pareto optimal frontier** across budget tiers (20%, 40%, 60%, 80%, 100%), allowing CFOs to pick their optimal trade-off point between capital expenditure and carbon abatement.

### 2. Capacitated Vehicle Routing (CVRPTW) Multi-Tenant Truck Pooling
- **Location:** [`backend/ml/logistics_optimizer.js`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/backend/ml/logistics_optimizer.js)
- **Problem:** MSMEs in clusters like Tirupur and Coimbatore dispatch partial truckloads (LTL) with 40–60% empty volume, paying high freight rates and emitting excessive Scope 3 carbon.
- **Solution:** Formulates logistics consolidation as a Capacitated Vehicle Routing Problem with Time Windows. Consolidates multiple shipments into high-efficiency vehicles (e.g., 28-tonne Euro-VI articulated trucks), achieving **$\ge 20\%$ emission cuts** and evaluating 4 dispatch routes:
  - `Fastest`: Direct point-to-point dedicated routing.
  - `Cheapest`: Multi-stop shared cargo consolidation.
  - `Lowest Carbon`: Rail/EV preferred low-intensity corridors.
  - `Balanced`: $\text{Score} = 0.4 \cdot \text{Cost} + 0.4 \cdot \text{Carbon} + 0.2 \cdot \text{Transit Time}$.

### 3. Empirical Bayesian Benchmark Learning (Data Flywheel)
- **Location:** [`backend/ml/bayesian_benchmarks.js`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/backend/ml/bayesian_benchmarks.js)
- **Problem:** Industrial benchmarks drift as local technology improves, but arithmetic averaging is susceptible to gaming, data poisoning, and synthetic demo profiles.
- **Solution:** Updates cluster benchmarks via Empirical Bayes shrinkage:
  $$\mu_{\text{updated}} = \frac{n}{n + \nu} \bar{x}_{\text{cluster}} + \frac{\nu}{n + \nu} \mu_{\text{prior}} \quad (\text{with pseudo-count } \nu = 8)$$
  Outlier points outside $[Q_1 - 1.5 \cdot \text{IQR}, Q_3 + 1.5 \cdot \text{IQR}]$ are automatically rejected. The evaluating plant's own data is excluded from its peer comparison (Jackknife resampling).

### 4. Lifecycle Carbon-Delta ($\Delta C_{\text{net}}$) Marketplace Ranker
- **Location:** [`backend/ml/marketplace_ranker.js`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/backend/ml/marketplace_ranker.js)
- **Problem:** A circular raw material (e.g., recycled cotton yarn) may have low production carbon, but if transported 2,500 km in an empty diesel truck, its delivered emissions may exceed virgin cotton!
- **Solution:** Computes the true Delivered Net Carbon Delta:
  $$\Delta C_{\text{net}} = (\text{EF}_{\text{virgin}} - \text{EF}_{\text{circular}}) \times M - (d_{\text{supplier}} \times \text{EF}_{\text{freight}} \times M)$$
  $$\text{Utility Score} = 0.40 \cdot \text{CarbonROI} + 0.30 \cdot \text{CostSavings} + 0.15 \cdot \text{TrustScore} + 0.15 \cdot \text{DigitalPassport}$$

### 5. Grounded Semantic RAG with Cryptographic Provenance
- **Location:** [`backend/rag/rag_service.js`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/backend/rag/rag_service.js), [`backend/rag/citation_formatter.js`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/backend/rag/citation_formatter.js)
- Retrieves precise regulatory clauses from sovereign knowledge base chunks (`datasets/10_rag_knowledge_base/`) and attaches verified badges containing exact 64-character SHA-256 hashes matching official government gazettes.

---

## 🏭 10 Supported Industrial Sectors & Demo Plants

Each sector includes verified specific energy consumption benchmarks ($p_{25}, p_{50}, p_{75}$), regional clusters, and calibrated demo profiles:

| Sector | Demo Plant Profile | Primary Cluster | Key Regulatory Exposure |
|---|---|---|---|
| **Textile Dyeing & Processing** | Tirupur Knitwear Dyeing Unit | Tirupur, Tamil Nadu | CCTS Crediting, ZLD Water Norms |
| **Foundry & Metal Casting** | Kovai Ferrous & Al Jobbing Foundry | Coimbatore, Tamil Nadu | EU CBAM Annex I (Cast Iron), PAT |
| **Ceramics & Tiles** | Morbi Vitrified Tile Plant | Morbi, Gujarat | Natural Gas Shift, CCTS Mandatory |
| **Food & Agro Processing** | Nashik Fruit Pulp & Concentrate Unit | Nashik, Maharashtra | Cold Chain Freon Phaseout, BRSR |
| **Auto Components & Machining** | Pune Tier-2 Precision Machine Shop | Pune, Maharashtra | Scope 3 OEM Value Chain Audits |
| **Pharmaceutical Formulation** | Hyderabad Oral Solid Dosage Plant | Hyderabad, Telangana | US FDA / WHO GMP Refusal Rules |
| **Plastics & Blow Moulding** | Silvassa Polymer Packaging Plant | Silvassa, DNH | EPR Plastic Waste Rules, Recycled Cap |
| **Paper & Corrugated Board** | Vapi Recycled Kraft Paper Mill | Vapi, Gujarat | Water Intensity Norms, Biomass Boilers |
| **Light Engineering & Fabrication** | Ludhiana Fasteners & Tools Unit | Ludhiana, Punjab | Electric Induction Furnaces, BEE MSME |
| **Specialty & Dye Chemicals** | Ankleshwar Intermediate Chemicals | Ankleshwar, Gujarat | High-COD Incineration, Solvent Recovery |

---

## 📊 Hero Plant Case Study — Tirupur Dyeing Facility

*Tirupur Processors Pvt Ltd · 3,600 tonnes/year dyed knitwear fabric*

```
===================================================================================
ANNUAL CARBON AUDIT SUMMARY (TIRUPUR KNITWEAR HERO DEMO)
===================================================================================
• Total Annual Footprint   : 24,069 tCO2e (Uncertainty: 19,414 – 29,492, ±20.9%)
• Scope Breakdown          : 28% Scope 1 · 8% Scope 2 · 64% Scope 3 (Raw Materials)
• Largest Leak Detected    : Purchased Cotton Yarn (60.6% of total footprint, CRITICAL)
• Peer Benchmark Breaches  : Grid Electricity at p78, Thermal Heat at p76 of peers
-----------------------------------------------------------------------------------
MARGINAL ABATEMENT COST CURVE (MACC) PORTFOLIO:
• Cash-Positive Actions    : 17 Interventions below the zero-line
• Capital Required (CapEx) : ₹4.56 Crore
• Annual Net Cost Savings  : ₹4.66 Crore / year
• Blended Payback Period   : 11.7 Months
• Net Abatement Achieved   : 6,020 tCO2e / year (25.0% of total footprint)
• Physical Refusals Active : Recycled cotton strictly capped at 25% by spinning limit
===================================================================================
```

---

## 🌐 Unified REST API Reference (Port 8080)

PRANGARA ships an ultra-fast, zero-npm-dependency REST API server ([`backend/server.js`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/backend/server.js)) responding in sub-10 milliseconds:

### Core Carbon Accounting & Simulation
- `POST /api/assess`: Evaluates a plant profile, returning full Scope 1/2/3 breakdown, leak detections, and MACC recommendations.
- `POST /api/assess/scenario`: What-if simulation comparing baseline vs modified profiles (solar switches, fuel substitutions), outputting exact $\Delta \text{tCO}_2\text{e}$ and rupee savings.
- `GET /api/demo/{sector_key}`: Returns instant pre-computed assessments for any of the 10 industrial sectors (e.g. `/api/demo/textile_dyeing`).

### Advanced ML & Operations Research
- `POST /api/ml/optimize-portfolio`: Runs the MILP knapsack solver under custom CapEx or payback limits, outputting the 5-point Pareto frontier.
- `POST /api/logistics/routes`: Evaluates freight corridors across 4 presets (`Fastest`, `Cheapest`, `Lowest Carbon`, `Balanced`).
- `POST /api/logistics/pool`: CVRPTW solver pooling multiple LTL shipments into bundled full truckloads.
- `POST /api/logistics/backhaul`: Matches empty truck return legs with circular cargo (e.g., rPET bales from Chennai Port to Tirupur).
- `POST /api/marketplace/rank-materials`: Multi-attribute circular byproduct ranker with net carbon delta ($\Delta C_{\text{net}}$) transport penalties.

### Compliance, RAG & Data Quality
- `POST /api/rag/ask`: Semantic question-answering over statutory documents with verifiable SHA-256 citations.
- `GET /api/compliance/cases`: Lists active statutory cases (EU CBAM, India CCTS, SEBI BRSR Core) with calculated financial exposure in INR.
- `POST /api/compliance/evaluate`: Direct statutory rule-pack evaluator on any custom plant assessment.
- `POST /api/data-quality/score`: Calculates GHG Protocol Data Quality Indicator (DQI) scores across TIER 1, TIER 2, and TIER 3 evidence.

### Reference & Audit
- `GET /api/health`: Health probe returning engine metrics, factor counts, and sector counts.
- `GET /api/sectors`: Lists all 10 supported industrial sectors with cluster registries.
- `GET /api/reference`: Statutory emission factors with uncertainty ranges and CEA state grid factors.
- `GET /api/corpus`: Cryptographic audit manifest of all 23 primary source documents.

---

## 📦 Shared Contracts & DTOs (`packages/contracts/`)

To guarantee seamless integration across frontend dashboards (`apps/web`), mobile APKs (`apps/mobile`), and the backend, PRANGARA maintains single-source-of-truth DTO contracts:
- **TypeScript ([`index.ts`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/packages/contracts/index.ts)):** 24 strictly typed interfaces (`User`, `Factory`, `PlantProfile`, `AssessmentResponse`, `Stream`, `Leak`, `Recommendation`, `RouteOption`, `ComplianceCase`, `RAGAnswer`).
- **Python Pydantic ([`schemas.py`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/packages/contracts/schemas.py)):** Input validation models for FastAPI/Python runtimes.
- **JSON Schemas ([`schemas.json`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/packages/contracts/schemas.json)):** Standard JSON Schemas for direct intake validation without OCR overhead.

---

## 🚀 Quick Start & Test Execution

Run the complete test suite and start the platform locally with **zero external npm installs**:

```bash
# 1. Clone and navigate to repository
git clone https://github.com/Destroyerved/Prangara.git
cd Prangara

# 2. Verify dataset layer & primary source authenticity (23/23 passing)
node datasets/08_automated_test_suites/verify_dataset_authenticity.js

# 3. Verify domain & physics invariants across all 10 sectors (18/18 passing)
node datasets/08_automated_test_suites/test_chakra_invariants.js

# 4. Run Advanced ML & Backend test suite (15/15 passing)
node backend/tests/test_ml_backend.js

# 5. Run Live REST API Integration test suite (16/16 passing)
node backend/tests/test_server_live.js

# 6. Launch the Unified Backend Server on port 8080
node backend/server.js
```

### Automated Test Verification
```
===================================================================================
PRANGARA AUTOMATED TEST SUITE EXECUTION SUMMARY
===================================================================================
1. datasets/08_automated_test_suites/verify_dataset_authenticity.js : 23/23 PASSED (100%)
2. datasets/08_automated_test_suites/test_chakra_invariants.js       : 18/18 PASSED (100%)
3. backend/tests/test_ml_backend.js                                  : 15/15 PASSED (100%)
4. backend/tests/test_server_live.js                                 : 16/16 PASSED (100%)
-----------------------------------------------------------------------------------
TOTAL TEST VERIFICATION: 72/72 TESTS PASSED WITH 0 FAILURES (100% RELIABILITY)
===================================================================================
```

---

## 🔒 Data Provenance & Cryptographic Authenticity

Every emission factor, conversion ratio, and benchmark in PRANGARA is cryptographically pinned and verified against official primary sources:

- **🟢 Official / Primary Reference:**
  - **CEA CO₂ Baseline v21 & v22:** Official Indian national and state grid emission factors.
  - **UK DESNZ 2026 GHG Conversion Factors:** Flat combustion factors for diesel, furnace oil, natural gas, LPG.
  - **IPCC 2019 Refinement:** Stationary combustion, first-order decay solid waste models.
  - **BEE MSME Energy Audits:** 55 industrial cluster benchmarks ($p_{25}, p_{50}, p_{75}$).
  - **BIS & IEC Standards:** IS 1489 (PPC fly-ash cement), IEC 60034-30-1 (IE3/IE4 electric motors).
  - **Global LCI References:** worldsteel 2025, International Aluminium Institute (IAI), PlasticsEurope, Textile Exchange LCA 2026.
- **Audit Register ([`source_registry.json`](file:///c:/Users/vedan/OneDrive/Desktop/prangara/datasets/06_auditing_and_proofs/source_registry.json)):**
  - All 23 source files carry immutable SHA-256 checksums verified on every build. Zero tampered or synthetic reference numbers.

---

## 📂 Repository Structure

```
PRANGARA/
├── backend/
│   ├── compliance/                    # Statutory rule packs (CBAM, CCTS, BRSR Core)
│   ├── data/                          # Seed payloads & hero plant demonstration data
│   ├── engine/                        # Deterministic sovereign carbon engine (ISO 14064)
│   │   ├── factors.js & factors.py    # Factor registry & interval uncertainty bands
│   │   ├── footprint.js               # Scope 1, Scope 2, Scope 3 stream inventory
│   │   ├── leaks.js                   # 3-tier leak detection & percentile ranking
│   │   ├── macc.js                    # 30 circular interventions & refusal constraints
│   │   └── assess.js                  # Master assessment orchestrator & Sankey builder
│   ├── ml/                            # Advanced ML & Operations Research layer
│   │   ├── portfolio_optimizer.js     # MILP multi-objective knapsack & Pareto frontier
│   │   ├── logistics_optimizer.js     # CVRPTW multi-tenant truck pooling & GLEC freight
│   │   ├── bayesian_benchmarks.js     # Empirical Bayes cluster learning data flywheel
│   │   └── marketplace_ranker.js      # Carbon-delta (ΔC_net) multi-attribute ranker
│   ├── rag/                           # Verifiable semantic retrieval with SHA-256 badges
│   ├── scripts/                       # Database seeders & demo initializers
│   ├── tests/                         # ML invariants & live server test suites
│   └── server.js                      # High-speed unified REST API server (Port 8080)
├── packages/
│   └── contracts/                     # Shared DTOs (TypeScript, Pydantic, JSON Schema)
├── datasets/                          # Cryptographically audited data architecture
│   ├── 01_statutory_emission_baselines/
│   ├── 02_circular_interventions_library/
│   ├── 03_industrial_sector_benchmarks/
│   ├── 06_auditing_and_proofs/        # SHA-256 registry and authenticity reports
│   ├── 07_primary_raw_sources/        # Immutable PDFs and XLSX files
│   ├── 08_automated_test_suites/      # Integrity audit test scripts
│   └── 10_rag_knowledge_base/         # Regulatory chunks for grounded RAG
├── src/                               # React & TypeScript web application (Vite, Tailwind, D3, Motion)
│   ├── components/                    # UI, Shell, Drawers, Intake, RAG Assistant, Charts
│   ├── pages/                         # Overview, Plant Data, Footprint, Leaks, Scenarios, Logistics, Circular Network...
│   ├── api/                           # Typed contracts, platform API client & adapters
│   └── styles/                        # Visual system, glassmorphism tokens & animations
├── prds/                              # PRANGARA v2.0 Working Specifications & Role Playbooks
├── docs/                              # Full technical specifications & architectural PRDs
├── .gitattributes                     # Binary hash preservation rules
├── .gitignore                         # Local notes and sensitive files exclusions
└── README.md                          # Platform master documentation
```

---

## 💻 Web Frontend Application

A React and TypeScript dashboard for industrial carbon intelligence, circular interventions, and investment decisions.

### Run locally

Use Node.js 20+ or 22+ and npm. All commands run from this folder:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173/overview`. The application serves fully local interactive demonstration profiles and features AI Intake, What-If Simulation, Green Logistics, and Industrial Symbiosis.

### Connect your backend

Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_DATA_MODE=api
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://127.0.0.1:8080
```

### Build and verify

```powershell
npm test
npm run build
npm run preview
```

The build is compiled into `dist/`. Preview runs at `http://127.0.0.1:4173`.

---

<div align="center">

### Built with precision for Indian MSME Decarbonization.
**PRANGARA · HackOut'26**

</div>
