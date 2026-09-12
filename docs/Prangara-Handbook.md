# PRANGARA HANDBOOK: The Complete Beginner & Executive Guide
### *How Industrial Plants Track Carbon, Eliminate Energy Waste, Save Crores, and Ace Global Compliance*

---

## 📖 Table of Contents
1. [What is Prangara? (Explain Like I'm 5)](#1-what-is-prangara-explain-like-im-5)
2. [The Problem Prangara Solves](#2-the-problem-prangara-solves)
3. [Under The Hood: Technology & Architecture](#3-under-the-hood-technology--architecture)
4. [Complete Page-by-Page Guide](#4-complete-page-by-page-guide)
   - [Workspace Hub (`/workspace`)](#1-workspace-hub-workspace)
   - [Account & Access (`/account`)](#2-account--access-account)
   - [Notifications Center (`/notifications`)](#3-notifications-center-notifications)
   - [Overview Dashboard (`/overview`)](#4-overview-dashboard-overview)
   - [Plant Data & Smart Intake (`/assessment`)](#5-plant-data--smart-intake-assessment)
   - [Emissions Footprint (`/footprint`)](#6-emissions-footprint-footprint)
   - [Leak Points Hotspots (`/leaks`)](#7-leak-points-hotspots-leaks)
   - [What-If Simulator (`/scenarios`)](#8-what-if-simulator-scenarios)
   - [Circular Actions (`/actions`)](#9-circular-actions-actions)
   - [Abatement Portfolio & MACC (`/portfolio`)](#10-abatement-portfolio--macc-portfolio)
   - [Marketplace & RFQs (`/marketplace`)](#11-marketplace--rfqs-marketplace)
   - [Green Logistics & Pooling (`/logistics`)](#12-green-logistics--pooling-logistics)
   - [Circular Network Symbiosis (`/circular-network`)](#13-circular-network-symbiosis-circular-network)
   - [Compliance & Reporting (`/compliance`)](#14-compliance--reporting-compliance)
   - [Methodology & Emission Factors (`/methodology`)](#15-methodology--emission-factors-methodology)
5. [The Indian Sector Benchmark Datasets](#5-the-indian-sector-benchmark-datasets)
6. [Field Tools: Mobile Companion App & Local Ollama AI](#6-field-tools-mobile-companion-app--local-ollama-ai)
7. [The 30-Day Story: Rajesh Garments in Tirupur](#7-the-30-day-story-rajesh-garments-in-tirupur)
8. [Quick Reference Cheat Sheet](#8-quick-reference-cheat-sheet)

---

## 1. What is Prangara? (Explain Like I'm 5)

Imagine you own a huge toy factory. Every day, big machines are humming, chimney pipes are puffing smoke, electricity meters are spinning fast, and trucks are driving in and out. 

At the end of every month:
1. Your electricity and diesel bills are gigantic.
2. A lot of that energy is leaking away (hot steam escaping into thin air, old motors running inefficiently).
3. Big international customers in Europe and banks in India are saying: *"If you don't tell us exactly how much smoke your factory makes, we will charge you a heavy carbon tax or stop buying from you!"*

**Prangara is like a Super-Smart Fitness Watch & Doctor for your factory.**
- Just like a fitness tracker counts your steps and heart rate, Prangara tracks your electricity, coal, diesel, raw materials, and truck deliveries.
- It spots where your factory is "leaking energy and cash" (like a doctor finding why you feel tired).
- It gives you a simulation playground with sliders so you can see: *"If I put solar panels on my roof or change my boiler fuel, I will save ₹48 Lakhs every year and eliminate 600 tonnes of pollution!"*
- It connects you to verified solar and recycling vendors and prints official green certificates ready for European customs and banks.

---

## 2. The Problem Prangara Solves

| Traditional Factory Pain Points | How Prangara Solves It |
| :--- | :--- |
| **Expensive Consultants:** Hiring carbon auditing firms costs ₹5L–₹25L per factory and takes 3 to 6 months. | **Instant Screening:** Ingest data via bills, spreadsheets, or camera scans and get an audit-grade baseline in minutes. |
| **"Going Green Costs Too Much":** Factory owners fear sustainability will eat up their profits. | **Cash-Positive First:** Prangara prioritizes interventions with negative abatement costs (projects that put money back in your pocket). |
| **EU CBAM & SEBI BRSR Panic:** Starting 2026, exporters face heavy carbon border taxes at European ports. | **Automated Exposure Calculator:** Calculates indicative CBAM tax in Euros/Rupees and generates BRSR Core-aligned reports. |
| **Supply Chain Freight Inefficiency:** Trucks drive half-empty between industrial clusters and ports. | **Smart Cargo Pooling:** Matches loads with neighboring factories to share trucks, saving up to 40% on freight bills and emissions. |
| **Industrial Waste Disposal Costs:** Plants pay money to dump boiler ash, cotton scraps, or chemical wash. | **Circular Symbiosis:** Finds neighboring plants that will buy your waste as raw material. |

---

## 3. Under The Hood: Technology & Architecture

Prangara is built as an enterprise-grade, deterministic, and security-first industrial platform:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRANGARA CLIENT APPS                     │
│  React 19 + Vite Web App        Expo / React Native Android │
│  (Modern Glassmorphism UI)      (Floor Camera & Offline)    │
└──────────────┬───────────────────────────────┬──────────────┘
               │ REST / JSON                   │ Offline Sync
┌──────────────▼───────────────────────────────▼──────────────┐
│                  FASTAPI BACKEND RUNTIME                    │
│  - OpenAPI Validation           - BRSR / CBAM Audit Engine  │
│  - Session & Role Auth          - Freight Pooling Logic     │
│  - Local SQLite / Postgres DB   - Symbiosis Directory       │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│ DETERMINISTIC ENGINE        │ │ OLLAMA LOCAL VLM            │
│ - CEA v22 Grid Factors      │ │ - Multi-modal Vision Model  │
│ - IPCC / DEFRA Formulas     │ │ - Electricity Bill OCR      │
│ - 100% Zero-LLM Math        │ │ - Machine Nameplate Parser  │
│ (Zero Hallucination)        │ │ (100% Private, On-Premise)  │
└─────────────────────────────┘ └─────────────────────────────┘
```

### The Invariant: Zero-LLM Math
In Prangara, **AI is never allowed to do arithmetic**. LLMs and Vision Models are strictly used for optical document parsing (reading numbers from pictures of electricity bills or brass nameplates). Once numbers are extracted, all carbon foot-printing, MACC curve economics, and tax liabilities are calculated using deterministic Python equations and certified emission factors.

---

## 4. Complete Page-by-Page Guide

---

### 1. Workspace Hub (`/workspace`)
* **What it is:** The command center for multi-site and multi-factory management.
* **What features it contains:**
  * Multi-factory comparative cards (total $tCO_2e$, Scope 3 footprint, data quality rating, active leak count).
  * 11 comprehensive tabs for each factory: Profile, Activity Records, Equipment/Assets, Sites, Intake, Assessments, Scenarios, Evidence, Tracker, Cases, and Audit trail.
* **How a user uses it:**
  1. Click **"Add a Factory"** to register a new industrial unit with its sector (e.g., Textile, Secondary Steel, Foundry) and district.
  2. Select any factory card to switch your active workspace.
  3. Manage machinery records (boilers, motors, chillers) and review historical assessment snapshots.

---

### 2. Account & Access (`/account`)
* **What it is:** Enterprise identity, access control, and organization management.
* **What features it contains:**
  * Active organization switcher.
  * Role-Based Access Control (RBAC): Factory Owner, Operational Engineer, Energy Auditor, and Marketplace Provider.
  * Developer API keys and webhook configurations.
* **How a user uses it:**
  * Switch between different industrial subsidiaries, assign team permissions, or grab an API token to integrate Prangara with your factory's ERP/SCADA system.

---

### 3. Notifications Center (`/notifications`)
* **What it is:** Operational and compliance warning center.
* **What features it contains:**
  * Spike anomaly alerts (e.g., *"Boiler fuel consumption rose by 14% this month"*).
  * Vendor quote notifications (e.g., *"3 bids received for 200kW rooftop solar RFQ"*).
  * Regulatory deadlines for EU CBAM export filings.
* **How a user uses it:**
  * Scan recent operational alerts, click on any notification to navigate directly to the affected machine or contract, and mark items as resolved.

---

### 4. Overview Dashboard (`/overview`)
* **What it is:** The executive single-page briefing for owners, boardrooms, and lenders.
* **What features it contains:**
  * **Cash-Positive Opportunity Banner:** Displays the headline annual net profit (e.g., *"₹52.4 Lakhs/yr"*) achievable through payback-positive green upgrades.
  * Total Carbon Footprint in $tCO_2e$ with Scope 1, Scope 2, and Scope 3 breakdown cards.
  * Sector Benchmark Percentile: Shows whether your mill is in the top 10% cleanest or bottom 30% wasteful among regional peers.
  * Quick-launch drawers detailing exact emission formulas.
* **How a user uses it:**
  * Log in daily or weekly to inspect the overall factory health, check total carbon output, and review top prioritized interventions.

---

### 5. Plant Data & Smart Intake (`/assessment`)
* **What it is:** The unified data ingestion portal to feed factory operational numbers into Prangara.
* **What features it contains:**
  * **8-Step Guided Wizard:** Identity, Scale, Energy, Materials, Waste, Freight, Economics, and Evidence.
  * **AI Camera & VLM Bill Scanner:** Upload utility bills or motor nameplate photos; local Ollama parses kWh, fuel volumes, and rated kW automatically.
  * **Excel / CSV Bulk Importer:** Drop spreadsheets to map years of historical energy records.
  * **Evidence Verification Checklist:** Attaches bill scans to audit-ready records.
* **How a user uses it:**
  1. Choose your ingestion method (drag & drop utility bills or enter figures manually).
  2. Review the auto-extracted numbers in the preview table.
  3. Click **"Run Screening Assessment"** to generate an instant baseline footprint.

---

### 6. Emissions Footprint (`/footprint`)
* **What it is:** Detailed forensic accounting of greenhouse gas emissions aligned with the GHG Protocol.
* **What features it contains:**
  * **Scope 1 (Direct Combustion):** Natural gas, diesel generators, coal boilers, furnace fuels.
  * **Scope 2 (Purchased Electricity):** State grid electricity mapped to regional Central Electricity Authority (CEA) emission factors.
  * **Scope 3 (Value Chain):** Raw material embodied carbon, inbound/outbound road freight, industrial wastewater, solid waste.
  * **Interactive Sankey Diagram:** Visual flow lines tracing energy inputs to emission outputs.
* **How a user uses it:**
  * Filter emissions by Scope. Click any row to open the reference drawer, displaying the emission factor source, denominator unit, and audit trail.

---

### 7. Leak Points Hotspots (`/leaks`)
* **What it is:** Automated engineering diagnostics that reveal where energy and money escape.
* **What features it contains:**
  * Hotspot diagnostic cards (e.g., *"Uninsulated Steam Lines"*, *"Low-Efficiency IE1 Induction Motors"*, *"Compressed Air Leaks"*).
  * Severity indicators (Critical, High, Moderate).
  * Cluster benchmark comparisons: Shows where your plant's specific energy consumption sits relative to BEE MSME cluster medians.
* **How a user uses it:**
  * Factory maintenance engineers review this page before plant shutdowns to plan maintenance, insulate pipes, and repair compressed air lines.

---

### 8. What-If Simulator (`/scenarios`)
* **What it is:** An interactive financial and carbon simulation sandbox.
* **What features it contains:**
  * **Interactive Levers:**
    * Rooftop Solar Slider (0% to 100% electricity offset).
    * Boiler Fuel Switch (Coal $\to$ Biomass Briquettes $\to$ Piped Natural Gas).
    * Recycled Content Slider (0% to 60% circular raw material).
    * Energy-Efficient IE4 Motors + Variable Frequency Drives (VFD) toggle.
    * Production Capacity Scale Delta (-50% to +50%).
  * **Real-Time Dynamic Metrics:** Live calculation of revised carbon footprint, annual rupee savings, and capital payback period.
* **How a user uses it:**
  1. Move the solar slider to 40% and click **"Switch to Biomass"**.
  2. Watch the live readout: *"Footprint drops by 412 tCO₂e, saves ₹26.5 Lakhs/year, payback in 2.2 years"*.
  3. Save the scenario or export the numbers for board approval.

---

### 9. Circular Actions (`/actions`)
* **What it is:** A curated catalog of pre-costed engineering upgrades tailored specifically to your plant.
* **What features it contains:**
  * Action cards categorized by: Quick Wins (payback < 12 months), Cash-Positive (high lifetime net benefit), and Net-Cost (deep decarbonization).
  * Capex, Opex delta, annual emission abatement ($tCO_2e$), and levelized cost of abatement ($₹/tCO_2e$).
  * Technical constraints (e.g., rooftop area limits, grid injection limits).
* **How a user uses it:**
  * Select high-impact recommendations and click **"Find Providers"** to push the scope directly to the marketplace for vendor bidding.

---

### 10. Abatement Portfolio & MACC (`/portfolio`)
* **What it is:** The Marginal Abatement Cost Curve (MACC) prioritization engine.
* **What features it contains:**
  * **Interactive MACC Chart:** Visualizes all potential interventions ranked from most cost-effective to most capital-intensive.
  * Negative bars represent projects that save money over their operational lifetime (e.g., waste heat recovery, LED retrofits, motor upgrades).
  * Positive bars represent deep-green interventions requiring net capital.
  * JSON / CSV portfolio export.
* **How a user uses it:**
  * Use the MACC curve to justify capital allocation to your bank or board, demonstrating that initial quick wins fund subsequent capital projects.

---

### 11. Marketplace & RFQs (`/marketplace`)
* **What it is:** Verified business-to-business directory and procurement platform for clean technology.
* **What features it contains:**
  * Directory of verified solar installers, ESCO energy auditors, biomass fuel suppliers, and recyclers.
  * **Carbon-Aware Materials:** Catalog of recycled cotton yarns, low-carbon slag cement, and reclaimed solvents sorted by lowest embodied carbon.
  * **RFQ Engine:** Publish Requests for Quotes with limited project context and compare incoming contractor proposals side-by-side.
* **How a user uses it:**
  1. Select an intervention (e.g., *"150 kW Rooftop Solar Installation"*).
  2. Check off 3 verified regional vendors and submit an RFQ.
  3. Compare bids on price, warranty, lead time, and payback impact, then click **"Accept Quote"**.

---

### 12. Green Logistics & Pooling (`/logistics`)
* **What it is:** Industrial freight optimization and cargo pooling engine.
* **What features it contains:**
  * Major industrial corridor routing (e.g., Tirupur $\to$ Chennai Port, Surat $\to$ Mundra, Pune $\to$ JNPT).
  * **Multi-Factory Cargo Pooling:** Combines partial truckloads with neighboring factories along the same highway corridor.
  * **Modal Switching:** Real-time comparison of Diesel Freight vs. Heavy Commercial EV vs. Container Rail.
* **How a user uses it:**
  * Enter outgoing shipment weight. Toggle **"Join Cargo Pool"** or **"Switch to Rail/EV"** to instantly reduce logistics bills and cut Scope 3 freight emissions.

---

### 13. Circular Network Symbiosis (`/circular-network`)
* **What it is:** An industrial by-product exchange connecting waste generators with industrial buyers.
* **What features it contains:**
  * Listings of secondary resources: Cotton Comber Noil, Class-F Fly Ash, Spent Solvents, Bagasse, Slag.
  * Avoided carbon calculation for buyers replacing virgin raw materials.
  * Cluster-based proximity matching (minimizing transit costs).
* **How a user uses it:**
  * List excess production by-products to generate new revenue streams, or source secondary materials at 20–40% below virgin raw material prices.

---

### 14. Compliance & Reporting (`/compliance`)
* **What it is:** Regulatory compliance evaluator and automated reporting tool.
* **What features it contains:**
  * **EU CBAM Readiness:** Computes indicative carbon tax liability for European exports based on reference EU ETS carbon prices.
  * **SEBI BRSR Core:** Validates compliance with Principle 6 (Environment) of India's Business Responsibility and Sustainability Reporting framework.
  * **ISO 14064 & GHG Protocol Alignment:** Highlights missing data points before official verification.
  * One-click export of executive summary PDFs and structured CSV audit sheets.
* **How a user uses it:**
  * Check your CBAM exposure before signing export contracts. Export the signed audit bundle for overseas customs clearance and bank ESG audits.

---

### 15. Methodology & Emission Factors (`/methodology`)
* **What it is:** The transparent, open mathematical ledger and emission factor library.
* **What features it contains:**
  * Full listing of CEA CO2 baseline database for Indian regional grids (v22).
  * IPCC 2006 / 2019 Refinement fuel emission factors.
  * Mathematical equations for Levelized Cost of Carbon Abatement (LCOA), Simple Payback, and Scope calculations.
* **How a user uses it:**
  * Open this page during audits or technical reviews to verify every factor and mathematical equation with zero black-box obscurity.

---

## 5. The Indian Sector Benchmark Datasets

Prangara comes pre-loaded with official baseline benchmarks extracted from the **Bureau of Energy Efficiency (BEE) 55 MSME Clusters Energy Mapping Study**:

| Sector | Key Industrial Clusters | Thermal Benchmark (GJ/t) | Electrical Benchmark (kWh/t) | Baseline Intensity ($tCO_2e/t$) |
| :--- | :--- | :--- | :--- | :--- |
| **Secondary Steel Re-Rolling** | Mandi Gobindgarh (PB), Jalna (MH), Bhavnagar (GJ) | 1.85 (1.4–2.6) | 110 (80–160) | 0.22 |
| **Aluminium Die-Casting** | Pune (MH), Coimbatore (TN), Ahmedabad (GJ) | 5.80 (4.2–8.5) | 620 (450–950) | 0.94 |
| **Textile Processing & Dyeing** | Surat (GJ), Tirupur (TN), Panipat (HR) | 18.50 (12–28) | 520 (350–800) | 2.15 |
| **Specialty Chemicals & Dyes** | Ankleshwar (GJ), Vapi (GJ), Tarapur (MH) | 14.20 (8–22) | 880 (500–1400) | 1.85 |
| **Ceramics & Vitrified Tiles** | Morbi (GJ), Thangadh (GJ), Khurja (UP) | 6.40 (4.8–9.2) | 180 (120–260) | 0.51 |
| **Foundry & Castings** | Rajkot (GJ), Belgaum (KA), Coimbatore (TN) | 4.90 (3.5–7.2) | 680 (520–980) | 0.88 |
| **Cement Grinding Units** | Neemuch (MP), Kalaburagi (KA) | 0.22 (0.1–0.4) | 38 (32–52) | 0.027 |
| **Paper & Kraft Packaging** | Vapi (GJ), Muzaffarnagar (UP), Morbi (GJ) | 10.20 (7.5–15) | 360 (280–520) | 1.12 |
| **Plastics Injection Molding** | Daman, Ahmedabad (GJ), Peenya (KA) | 1.10 (0.5–2.2) | 950 (600–1600) | 0.74 |
| **Food & Grain Milling** | Indore (MP), Khanna (PB), Unjha (GJ) | 3.20 (1.8–5.5) | 150 (90–240) | 0.35 |

---

## 6. Field Tools: Mobile Companion App & Local Ollama AI

### 📱 Android Companion App (`apps/mobile`)
Designed for floor technicians and environmental engineers walking the factory floor:
* **Offline-First:** Collect meter readings, diesel logbooks, and motor tags even inside thick concrete sheds with no mobile network.
* **Camera Capture:** Snap photos of electricity utility bills and motor nameplates.
* **Idempotent Background Sync:** When back online, uploads sync safely without duplicate entries.

### 🧠 Local Ollama Visual AI
* **100% Private & On-Premise:** Runs locally on your machine at `http://127.0.0.1:11434`.
* **Multimodal Extraction:** Extracts parameters from machine nameplates (rated power kW, RPM, power factor) and utility bills (peak kWh, reactive power charges) without sending confidential plant data to external cloud servers.

---

## 7. The 30-Day Story: Rajesh Garments in Tirupur

Here is how a real plant manager uses Prangara in practice:

* **Day 1 (The Crisis):** Rajesh owns a knitwear dyeing plant in Tirupur, Tamil Nadu. A major European sports brand warns him: *"Submit your verified product carbon footprint by next month, or your export orders will face heavy CBAM carbon penalty deductions."*
* **Day 3 (Intake in 15 Minutes):** Rajesh opens Prangara on his computer. Using the [Plant Data Intake](file:///c:/Users/mehul/Desktop/Meow/Prangara/src/pages/PlantData.tsx), he uploads his 12 monthly electricity bills from TANGEDCO and diesel receipts. The local AI extracts the numbers, and the engine calculates his baseline: **2,150 $tCO_2e$/year**.
* **Day 5 (Spotting the Leaks):** The [Leak Points](file:///c:/Users/mehul/Desktop/Meow/Prangara/src/pages/LeakPoints.tsx) page flags that his wood-fired boiler operates at only 61% thermal efficiency, and his spinning shed motors are outdated IE1 models losing ₹11 Lakhs in excess heat every year.
* **Day 9 (Testing Scenarios):** Rajesh opens the [What-If Simulator](file:///c:/Users/mehul/Desktop/Meow/Prangara/src/pages/Scenarios.tsx). He drags the solar slider to **40% rooftop solar**, toggles **Biomass Briquette Switch**, and checks **IE4 Energy-Efficient Motors**. The simulator shows: **Carbon drops by 36%**, saving **₹38.5 Lakhs every year**, with complete payback in **2.4 years**.
* **Day 14 (Procurement on Marketplace):** Rajesh navigates to the [Marketplace](file:///c:/Users/mehul/Desktop/Meow/Prangara/src/pages/Marketplace.tsx), checks 3 verified Coimbatore solar installers, and sends an instant RFQ. Within 48 hours, he receives and accepts a competitive bid.
* **Day 22 (Freight Pooling):** For his export container to Chennai Port, he uses [Green Logistics](file:///c:/Users/mehul/Desktop/Meow/Prangara/src/pages/Logistics.tsx) to join a shared multi-factory corridor pool, cutting his freight invoice by 28%.
* **Day 30 (Audit Certified):** Rajesh exports the official PDF from [Compliance](file:///c:/Users/mehul/Desktop/Meow/Prangara/src/pages/Compliance.tsx). He sends it to his European customer: zero CBAM deductions, full compliance approved, and a guaranteed supply contract for the next 3 years!

---

## 8. Quick Reference Cheat Sheet

| Action | Shortcut / Location |
| :--- | :--- |
| **Start Everything (Backend + Frontend)** | Double-click `start.bat` in the project root |
| **Stop Everything** | Double-click `stop.bat` in the project root |
| **Global Command Bar** | Press `Ctrl + K` (or `Cmd + K` on Mac) anywhere |
| **Ask Prangara AI** | Click the Sparkles ✨ button in the bottom right corner |
| **Local Web App URL** | `http://127.0.0.1:5173` |
| **FastAPI Interactive Docs** | `http://127.0.0.1:8000/docs` |
| **Local Ollama Daemon** | `http://127.0.0.1:11434` |

---
*Created for PRANGARA – The Industrial Decarbonization & Circularity Operating System.*
