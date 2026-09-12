<div align="center">

# ⚡ PRANGARA (प्रांगार)
### Industrial Carbon Intelligence & Autonomous Decarbonization Network

*HackOut'26 · Problem Statement PS10*  
**Industrial Emission Leak-Point Detector & Circular Alternative Recommender**

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-71%20endpoints-009688?style=for-the-badge&logo=fastapi&logoColor=white)](#-rest-api-reference-port-8000)
[![Expo](https://img.shields.io/badge/Android-Expo%20%2F%20React%20Native-000020?style=for-the-badge&logo=expo&logoColor=white)](apps/mobile/README.md)
[![Tests](https://img.shields.io/badge/Tests-165%20passing-2ea44f?style=for-the-badge&logo=pytest&logoColor=white)](#tests)
[![Provenance](https://img.shields.io/badge/Source%20Artefacts-22%2F23%20verified-e8a33d?style=for-the-badge&logo=security&logoColor=white)](#-data-provenance--cryptographic-authenticity)
[![Runs Offline](https://img.shields.io/badge/Core-Runs%20Offline-6f42c1?style=for-the-badge)](#-quick-start)
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
- [REST API Reference (Port 8000)](#-rest-api-reference-port-8000)
- [Shared Contracts & DTOs (`packages/contracts/`)](#-shared-contracts--dtos-packagescontracts)
- [Quick Start](#-quick-start)
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
- **Location:** [`backend/ml/portfolio_optimizer.js`](backend/ml/portfolio_optimizer.js)
- **Problem:** Factory owners have tight budget caps and required payback periods. A naive greedy sort by LCOA fails under multi-meter interactions.
- **Solution:** Solves the 0/1 multi-objective knapsack problem:
  $$\max \sum_{i=1}^{N} \text{Abatement}_i \cdot x_i \quad \text{subject to} \quad \sum_{i=1}^{N} \text{Capex}_i \cdot x_i \le B, \quad \max_{i} (\text{Payback}_i \cdot x_i) \le T_{\max}$$
  Automatically computes a **5-point monotonic Pareto optimal frontier** across budget tiers (20%, 40%, 60%, 80%, 100%), allowing CFOs to pick their optimal trade-off point between capital expenditure and carbon abatement.

### 2. Capacitated Vehicle Routing (CVRPTW) Multi-Tenant Truck Pooling
- **Location:** [`backend/ml/logistics_optimizer.js`](backend/ml/logistics_optimizer.js)
- **Problem:** MSMEs in clusters like Tirupur and Coimbatore dispatch partial truckloads (LTL) with 40–60% empty volume, paying high freight rates and emitting excessive Scope 3 carbon.
- **Solution:** Formulates logistics consolidation as a Capacitated Vehicle Routing Problem with Time Windows. Consolidates multiple shipments into high-efficiency vehicles (e.g., 28-tonne Euro-VI articulated trucks), achieving **$\ge 20\%$ emission cuts** and evaluating 4 dispatch routes:
  - `Fastest`: Direct point-to-point dedicated routing.
  - `Cheapest`: Multi-stop shared cargo consolidation.
  - `Lowest Carbon`: Rail/EV preferred low-intensity corridors.
  - `Balanced`: $\text{Score} = 0.4 \cdot \text{Cost} + 0.4 \cdot \text{Carbon} + 0.2 \cdot \text{Transit Time}$.

### 3. Empirical Bayesian Benchmark Learning (Data Flywheel)
- **Location:** [`backend/ml/bayesian_benchmarks.js`](backend/ml/bayesian_benchmarks.js)
- **Problem:** Industrial benchmarks drift as local technology improves, but arithmetic averaging is susceptible to gaming, data poisoning, and synthetic demo profiles.
- **Solution:** Updates cluster benchmarks via Empirical Bayes shrinkage:
  $$\mu_{\text{updated}} = \frac{n}{n + \nu} \bar{x}_{\text{cluster}} + \frac{\nu}{n + \nu} \mu_{\text{prior}} \quad (\text{with pseudo-count } \nu = 8)$$
  Outlier points outside $[Q_1 - 1.5 \cdot \text{IQR}, Q_3 + 1.5 \cdot \text{IQR}]$ are automatically rejected. The evaluating plant's own data is excluded from its peer comparison (Jackknife resampling).

### 4. Lifecycle Carbon-Delta ($\Delta C_{\text{net}}$) Marketplace Ranker
- **Location:** [`backend/ml/marketplace_ranker.js`](backend/ml/marketplace_ranker.js)
- **Problem:** A circular raw material (e.g., recycled cotton yarn) may have low production carbon, but if transported 2,500 km in an empty diesel truck, its delivered emissions may exceed virgin cotton!
- **Solution:** Computes the true Delivered Net Carbon Delta:
  $$\Delta C_{\text{net}} = (\text{EF}_{\text{virgin}} - \text{EF}_{\text{circular}}) \times M - (d_{\text{supplier}} \times \text{EF}_{\text{freight}} \times M)$$
  $$\text{Utility Score} = 0.40 \cdot \text{CarbonROI} + 0.30 \cdot \text{CostSavings} + 0.15 \cdot \text{TrustScore} + 0.15 \cdot \text{DigitalPassport}$$

### 5. Grounded Semantic RAG with Cryptographic Provenance
- **Location:** [`backend/rag/rag_service.js`](backend/rag/rag_service.js), [`backend/rag/citation_formatter.js`](backend/rag/citation_formatter.js)
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

## 🌐 REST API Reference (Port 8000)

The running backend is the Python/FastAPI service in [`backend/`](backend/) —
**71 endpoints, 147 tests**. Interactive docs at `http://localhost:8000/api/docs`;
the machine-readable contract is
[`packages/contracts/openapi.json`](packages/contracts/openapi.json), regenerated
with `python -m scripts.export_openapi`.

> **Two backends live in this repository.** `backend/` (Python/FastAPI) is the
> one that runs, per `docs/PRD.md` §24 and `docs/task.md` BE-1. A parallel Node
> implementation is preserved in [`backend-node/`](backend-node/README.md) — see
> that README for what is worth porting across. Keeping two live would mean two
> sets of emission factors and two answers to the same question, which is what
> `docs/AI_AGENT_PLAYBOOK.md` §1 exists to prevent.

### Anonymous sandbox — no account required
- `GET  /api/health` — status, engine version, reference dataset hashes, and which optional features this deployment actually has
- `GET  /api/sectors`, `GET /api/sectors/{key}` — the 10 supported sectors
- `POST /api/assess` — stateless assessment; nothing is stored
- `GET  /api/demo/{sector_key}` — a fully worked example per sector
- `GET  /api/reference`, `/api/reference/factors/{key}`, `/api/reference/interventions`
- `GET  /api/reference/provenance` — **every active factor traced to its source document, with disagreements flagged**
- `GET  /api/corpus` — benchmark flywheel health (aggregate only; no factory is identifiable)

### Identity & access
- `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `/logout-all`
- `GET  /api/auth/me` — user, memberships, and the permissions the UI uses
- `POST /api/organizations/{id}/members` — invite; `DELETE` to remove
- `POST /api/factories/{id}/access` — grant one named person one factory, with a level and an expiry; `DELETE` revokes

### Factories, intake & assessment
- `GET/POST /api/factories`, `PATCH/DELETE /api/factories/{id}`
- `GET/POST /api/factories/{id}/sites`, `/activity`, `/assets`, `PUT /profile`
- `POST /api/intake/conversation/extract` — plain-language extraction; **never writes**
- `POST /api/intake/document/extract`, `/equipment/extract` — capture and store as evidence
- `POST /api/intake/factories/{id}/confirm` — the *only* path by which an extracted value becomes factory data
- `POST /api/factories/{id}/assessments` — run the engine, persist with a full version stamp
- `POST /api/factories/{id}/scenarios`, `POST /api/scenarios/{id}/run` — what-if against the same engine

### Actions, evidence & verification
- `GET /api/factories/{id}/actions`, `PATCH /api/actions/{id}`
- `POST /api/actions/{id}/verification`, `POST /api/verification/{id}/results` — baseline vs expected vs actual
- `POST /api/evidence` (multipart), `/links`, `/verify`, `/download`

### Marketplace
- `GET /api/providers`, `/api/providers/match` — weighted, **explained** matching
- `POST /api/rfqs`, `/api/rfqs/{id}/quotes`, `GET /api/rfqs/{id}/compare`
- `POST /api/quotes/{id}/accept`, `GET/POST /api/materials`

### Compliance & notifications
- `GET  /api/factories/{id}/compliance` — readiness, with every line labelled by what produced it
- `POST /api/compliance/evaluate` — **202 and an event, never a verdict** (the evaluator is BE-2's)
- `GET/POST /api/compliance/cases`, `PATCH`, `/evidence`, `/close`, `/corrective-actions`
- `GET /api/notifications`, `GET /api/factories/{id}/audit`, `/events`

### Not yet built in the Python service
Logistics routing and pooling, RAG question-answering, and the compliance rule
evaluator are BE-2's scope. Reference implementations exist in `backend-node/`.
`POST /api/compliance/evaluate` already raises the event a rule evaluator would
consume, and an event with no registered handler is marked processed **with a
note**, so the gap stays visible rather than silently resolving to "compliant".

---

## 📦 Shared Contracts & DTOs (`packages/contracts/`)

To guarantee seamless integration across frontend dashboards (`apps/web`), mobile APKs (`apps/mobile`), and the backend, PRANGARA maintains single-source-of-truth DTO contracts:
- **TypeScript ([`index.ts`](packages/contracts/index.ts)):** 24 strictly typed interfaces (`User`, `Factory`, `PlantProfile`, `AssessmentResponse`, `Stream`, `Leak`, `Recommendation`, `RouteOption`, `ComplianceCase`, `RAGAnswer`).
- **Python Pydantic ([`schemas.py`](packages/contracts/schemas.py)):** Input validation models for FastAPI/Python runtimes.
- **JSON Schemas ([`schemas.json`](packages/contracts/schemas.json)):** Standard JSON Schemas for direct intake validation without OCR overhead.

---

## 🚀 Quick Start

```bash
git clone https://github.com/Destroyerved/Prangara.git
cd Prangara
```

### Backend — Python / FastAPI

```bash
cd backend
pip install -r requirements.txt
python -m alembic upgrade head      # 29 tables
python -m scripts.seed_demo         # 6 accounts, 3 factories, quotes, alerts
python -m uvicorn app.main:app --reload
```

API docs: `http://localhost:8000/api/docs`.
The seed prints the demo accounts; the password is `prangara-demo-2026`.

Event worker, in a second terminal:

```bash
cd backend && python -m app.workers.outbox
```

Defaults to a local SQLite file so it runs with no services started. Point
`DATABASE_URL` at PostgreSQL for PostGIS and pgvector work. See `.env.example`.

### Mobile — Expo / React Native

```bash
cd apps/mobile
npm install
npm start          # then press `a` for Android, or scan with Expo Go
```

On a physical phone, `localhost` is the phone — the client falls back to the
Expo dev host on port 8000, and `EXPO_PUBLIC_API_URL` overrides it. The Account
tab shows which URL was resolved and whether the API answered.

### Tests

```bash
cd backend && python -m pytest tests -q                  # 147 passed
cd apps/mobile && npm run typecheck                      # clean
cd apps/mobile && npm run bundle:android                 # Android bundle builds

node datasets/08_automated_test_suites/test_chakra_invariants.js        # 18/18
node datasets/08_automated_test_suites/verify_dataset_authenticity.js   # 22/23 — see below
```

The 147 Python tests include 85 engine invariants from `docs/task.md` §15 run across
all ten sectors, full tenant-isolation checks, and the PRD §32 demo path
end to end.

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
- **Audit register:** [`datasets/06_auditing_and_proofs/chakra_source_registry.json`](datasets/06_auditing_and_proofs/chakra_source_registry.json)
  — 20 registered sources, each with publisher, document, version, URL, retrieval
  date and a SHA-256 of the downloaded artefact.

- **Live traceability:** `GET /api/reference/provenance` joins the engine's
  active factors to those source records. **25 of 31 active factors (81%)** carry
  a full official citation today; the remaining six are unmapped and say so
  rather than claiming a source they do not have.

- **Two registries, disagreements reported not hidden.** The engine computes from
  `backend/data/reference/`; the verified dataset is a second opinion. They agree
  within 5% on 23 of 25 shared factors, with two exceptions surfaced by the API:

  | Factor | Engine | Verified | Δ | Verified source |
  |---|---|---|---|---|
  | `COAL_INDIAN` | 1.70 tCO₂e/t | 1.504 tCO₂e/t | −11.5% | IPCC 2019 Refinement (derived with Coal India G11–G13 NCV) |
  | `STEEL_SECONDARY` | 0.55 tCO₂e/t | 0.58 tCO₂e/t | +5.5% | worldsteel LCI |

  Coal matters — it dominates Scope 1 for a foundry or a dyeing plant.
  Assessments are computed with the engine value and the difference is reported,
  because which one is correct is a reference-data decision (BE-2, `docs/task.md` §5),
  and adopting either silently would change the basis of results factories have
  already been shown.

- **One known integrity failure.** `verify_dataset_authenticity.js` reports
  **22 of 23** artefacts verified. `cpcb_hazardous_waste_rules_2016.pdf` is a
  140-byte HTML redirect stub, not the rules document — the download captured a
  redirect. No emission factor cites `SRC-CPCB-RULES`, so no carbon number rests
  on it; it backs compliance rule text, which is not yet implemented. Re-fetching
  the real PDF and updating its checksum is an open BE-2 task. This is stated
  rather than rounded up to 100%, because a provenance claim that is not checked
  is worth nothing.

---

## 📂 Repository Structure

```
PRANGARA/
├── backend/                           # ★ the running backend — Python / FastAPI
│   ├── app/
│   │   ├── api/                       # 13 route modules, 71 endpoints
│   │   ├── core/                      # config, database, JWT, errors, rate limiting
│   │   ├── models/                    # 29 SQLAlchemy tables
│   │   ├── schemas/                   # Pydantic DTOs — the shared contract
│   │   ├── services/                  # access, assessment, benchmarks, data quality,
│   │   │                              #   events, audit, storage, units, provenance
│   │   └── workers/outbox.py          # event worker (database outbox)
│   ├── engine/                        # deterministic carbon engine — source of truth
│   │   ├── factors.py                 # factor registry, low/base/high bands
│   │   ├── footprint.py               # Scope 1/2/3 stream inventory
│   │   ├── leaks.py                   # 3-rule leak detection, percentile ranking
│   │   ├── macc.py                    # interventions, economics, interaction de-rating
│   │   ├── assess.py                  # orchestrator, Sankey, compliance panel
│   │   └── version.py                 # engine + reference content hashes
│   ├── data/reference/                # active reference registry the engine reads
│   ├── migrations/                    # Alembic
│   ├── scripts/                       # seed_demo.py, export_openapi.py
│   └── tests/                         # 147 tests
├── backend-node/                      # parallel Node implementation, parked — see its README
├── apps/
│   └── mobile/                        # Android companion (Expo / React Native)
│       └── src/{api,auth,components,lib,navigation,screens,storage,theme}
├── packages/
│   └── contracts/                     # openapi.json + shared TypeScript / Pydantic DTOs
├── datasets/                          # audited reference data architecture (BE-2)
│   ├── 01_statutory_emission_baselines/
│   ├── 02_circular_interventions_library/
│   ├── 03_industrial_sector_benchmarks/
│   ├── 06_auditing_and_proofs/        # source registry + SHA-256 verification
│   ├── 07_primary_raw_sources/        # the actual PDFs and spreadsheets
│   ├── 08_automated_test_suites/      # integrity and invariant checks
│   └── 10_rag_knowledge_base/         # regulatory chunks for grounded RAG
├── docs/                              # ★ the specification — read these first
│   ├── README_START_HERE.md           # reading order and claim boundaries
│   ├── PRD.md                         # product definition, FR-01..FR-57
│   ├── task.md                        # role ownership and phase plan
│   ├── DATA_RAG_COMPLIANCE.md         # sources, provenance, RAG, compliance
│   └── AI_AGENT_PLAYBOOK.md           # rules for AI agents working here
├── ROADMAP.md                         # tasks to a deployed product, with owners
├── PROGRESS.md                        # what is built, what is not, and why
├── HANDOFF_BACKEND.md                 # BE-1 handoff
├── HANDOFF_MOBILE.md                  # FE-2 handoff
└── README.md
```

The web dashboard (FE-1) lives on the `Frontend` branch.

---

<div align="center">

### Built with precision for Indian MSME Decarbonization.
**PRANGARA · HackOut'26**

</div>
