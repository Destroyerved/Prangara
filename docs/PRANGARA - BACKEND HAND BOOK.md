# PRANGARA - BACKEND HANDBOOK
### *The Engineering, Data Architecture & Deterministic Mathematics Bible*

---

## 📖 Table of Contents
1. [Introduction & Toddler Analogy](#1-introduction--toddler-analogy)
2. [End-to-End Processing Conveyor Belt](#2-end-to-end-processing-conveyor-belt)
3. [Methods of Data Extraction](#3-methods-of-data-extraction)
4. [The Pydantic Bouncer & Canonical Contract](#4-the-pydantic-bouncer--canonical-contract)
5. [The Exact Mathematical Equations](#5-the-exact-mathematical-equations)
   - [Scope 2 Electricity Formula](#a-scope-2-purchased-electricity)
   - [Scope 1 Thermal Fuel Aggregation & NCV Energy Conversion](#b-scope-1-thermal-fuels--ncv-conversion)
   - [Biogenic CO2 Separation Rule](#c-biogenic-co2-separation-rule)
   - [Scope 3 Value Chain Calculations](#d-scope-3-value-chain-accounting)
   - [Gate-to-Gate vs. Cradle-to-Gate Intensities](#e-gate-to-gate-vs-cradle-to-gate-intensities)
6. [How It Predicts: The 3 Benchmark Leak Detection Rules](#6-how-it-predicts-the-3-benchmark-leak-detection-rules)
7. [The MACC Financial Optimization Engine](#7-the-macc-financial-optimization-engine)
   - [Capital Recovery Factor (CRF)](#a-capital-recovery-factor-crf)
   - [Levelized Cost of Abatement (LCOA)](#b-levelized-cost-of-abatement-lcoa)
   - [Simple Payback & Net Present Value (NPV)](#c-simple-payback--npv)
8. [Sector Inadmissibility: Blocked & Capped Rules](#8-sector-inadmissibility-blocked--capped-rules)
9. [Regulatory Export Calculations: EU CBAM & SEBI BRSR](#9-regulatory-export-calculations-eu-cbam--sebi-brsr)
10. [Backend Service Directory & File Map](#10-backend-service-directory--file-map)

---

## 1. Introduction & Toddler Analogy

> **👶 Toddler Version:**  
> Imagine you bring a big bucket of dirty, messy lego blocks to a robot.  
> 1. A camera robot looks into the bucket and writes down how many blocks are red and blue.  
> 2. A strict teacher at the door checks if any blocks are missing or broken.  
> 3. A giant super-calculator multiplies the blocks using secret government recipe books.  
> 4. A smart doctor says: *"Aha! You have too many broken blocks here—if you fix these three, you will get ₹50 Lakhs back!"*  
> 5. A printer stamps an official gold certificate that lets your toy trucks travel to Europe without paying any fines!

---

## 2. End-to-End Processing Conveyor Belt

```
[ STEP 1: RAW INTAKE ]
  Electricity Bills (PDF/Images)  ──► Local Ollama VLM (Private Multimodal OCR)
  Motor Nameplates Stamped Metal  ──► Vision Extractor
  Fuel Delivery Challans          ──► Heuristic Regex Tokenizers
  Excel / CSV Files               ──► Columnar Schema Mapper
              │
              ▼
[ STEP 2: CANONICAL CONTRACT & VALIDATION ]
  Pydantic Model: PlantProfileIn
  - Rejects negative numbers (e.g. -500L diesel fails loudly)
  - Enforces non-null invariants and recognized fuel/stream keys
              │
              ▼
[ STEP 3: DETERMINISTIC FACTOR REGISTRY ]
  FactorDB:
  - CEA v22 Grid Factors (0.716 kg CO2e/kWh for National & Southern Grids)
  - IPCC 2006 Fuel Combustion Densities (GJ) & Emission Coefficients
  - DEFRA Modal Freight Factors (tCO2e / t·km)
              │
              ▼
[ STEP 4: STREAM-RESOLVED GHG FOOTPRINT ]
  compute_footprint() builds:
  - Scope 1: Aggregated Process Heat (Coal, Briquette, Gas) + Standalone Diesel
  - Scope 2: Purchased Electricity
  - Scope 3: Materials + Waste + Freight
  - Biogenic CO2 memo accounting (GHG Protocol Corporate Standard)
              │
              ▼
[ STEP 5: BENCHMARK LEAK DETECTOR ]
  detect_leaks() compares Gate-to-Gate (Scope 1+2) vs BEE 55 MSME Clusters:
  - Rule 1: Benchmark Breach (> p75 of sector)
  - Rule 2: Material Concentration (> 15% of footprint & > p50 median)
  - Rule 3: Structural Hotspot (> 25% of footprint, Scope 3 materials)
              │
              ▼
[ STEP 6: MACC OPTIMIZATION ENGINE ]
  recommend() produces Marginal Abatement Cost Curve:
  - Annualises Capex with Capital Recovery Factor: CRF = r(1+r)^n / ((1+r)^n - 1)
  - Computes Levelized Cost of Abatement: LCOA = (CRF·Capex + ΔOpex - Saving) / Abatement
  - Partitions into Cash-Positive (LCOA < 0), Quick Wins, and Net Cost
              │
              ▼
[ STEP 7: DISPATCH & COMPLIANCE ]
  - EU CBAM Export Exposure: (Scope 1 + 2) × Export Share × Reference Price
  - Green Logistics Corridor Pooling & Modal Shift (Road to Rail/EV)
  - Circular Symbiosis Matching (Avoided Embodied Emissions)
  - Server-Side Vector SVG Report Generator (Auditable PDF/CSV Export)
```

---

## 3. Methods of Data Extraction

### 1. Local Ollama Multimodal Vision AI (`backend/app/services/ollama_service.py`)
* **How it works:** Communicates with local vision models (`llama3:latest`, `gemma4:latest`, `llava`) running at `http://127.0.0.1:11434`.
* **Utility Bills:** Reads raw scans/photos of electricity bills (TANGEDCO, MSEDCL, BESCOM, etc.) extracting:
  * Total Consumption (kWh)
  * Billed Demand (kVA)
  * Power Factor (e.g. 0.94)
  * Billing Period (Start & End dates)
  * Total Payable (INR)
* **Motor Nameplates:** Reads stamped brass/aluminium equipment plates extracting:
  * Rated Power (kW)
  * Operating RPM (e.g. 1480 RPM)
  * Efficiency Class (IE1 standard vs. IE4 super-premium)
  * Rated Voltage & Full Load Amperes (FLA)
* **Privacy Guarantee:** 100% on-premise execution. Sensitive manufacturing figures never touch third-party cloud servers.

### 2. Heuristic Pattern Matchers (`backend/app/services/intake_extract.py`)
* **Zero-LLM Deterministic Fallback:** Uses specialized regex tokenizers to extract meter constants, fuel quantities, and tariff codes.
* **Sanity Range Clamps:** Rejects impossible physical readings (e.g., Power Factor > 1.0 or negative kilowatt-hours).

---

## 4. The Pydantic Bouncer & Canonical Contract

In `backend/app/schemas/factory.py`, the engine will **never** accept raw unstructured data. Every single route must transform its payload into `PlantProfileIn`:

```python
class PlantProfileIn(ApiModel):
    """Exactly what engine.assess() consumes. Field names are engine-defined."""
    name: str = "Unnamed plant"
    sector: str
    state: str | None = None
    annual_output_t: float = Field(default=0, ge=0)
    annual_revenue_cr: float = Field(default=0, ge=0)
    electricity_kwh: float = Field(default=0, ge=0)
    fuels: dict[str, float] = Field(default_factory=dict)
    materials: dict[str, float] = Field(default_factory=dict)
    waste: dict[str, float] = Field(default_factory=dict)
    freight: dict[str, float] = Field(default_factory=dict)
    eu_export_share_pct: float = Field(default=0, ge=0, le=100)

    @model_validator(mode="after")
    def _no_negative_quantities(self) -> "PlantProfileIn":
        # A negative activity quantity is not a small data problem,
        # it is an invalid inventory. Fail loudly here rather than
        # letting it become a negative emission downstream.
        for label, mapping in (
            ("fuels", self.fuels), ("materials", self.materials),
            ("waste", self.waste), ("freight", self.freight),
        ):
            for key, value in mapping.items():
                if value < 0:
                    raise ValueError(f"{label}.{key} cannot be negative")
        return self
```

---

## 5. The Exact Mathematical Equations

### A. Scope 2: Purchased Electricity
$$E_{\text{Scope 2}} = \frac{\text{Electricity (kWh)} \times \text{Regional CEA Factor (0.716)}}{1000} \quad [\text{tCO}_2\text{e}]$$

### B. Scope 1: Thermal Fuels & NCV Conversion
Because fuels differ in moisture and energy density, all combustion fuels are converted to **Gigajoules (GJ)** using Net Calorific Values (NCV):
$$\text{Thermal Energy (GJ)} = \sum_{i} \left( \text{Fuel Qty}_i \times \text{NCV}_i \right)$$
$$\text{Scope 1 Process Heat (tCO}_2\text{e)} = \sum_{i} \left( \text{Fuel Qty}_i \times \text{Emission Factor}_i \right)$$

*Constants in `backend/engine/constants.py`:*
* `COAL_INDIAN`: 15.9 GJ/tonne (high ash, ~3800 kcal/kg)
* `BIOMASS_BRIQUETTE`: 15.0 GJ/tonne
* `FURNACE_OIL`: 0.0405 GJ/kg
* `NATURAL_GAS`: 0.0360 GJ/Sm³
* `DIESEL`: 0.0360 GJ/Litre

### C. Biogenic CO2 Separation Rule
Per the **GHG Protocol Corporate Standard**, direct CO₂ from burning biomass is biogenic and must **NOT** be included in Scope 1 totals. Prangara isolates biogenic carbon on a separate memo disclosure line:
$$\text{Biogenic CO}_2 \text{ Memo (tCO}_2) = \text{Briquette Tonnes} \times 1.55$$

### D. Scope 3: Value Chain Accounting
* **Purchased Materials:** $\sum (\text{Material Tonnes}_i \times \text{Embodied Factor}_i)$
* **Waste Disposal:** $\sum (\text{Waste Tonnes}_i \times \text{Landfill/Treatment Factor}_i)$
* **Freight Logistics:** $\sum (\text{Tonne-km}_i \times \text{Modal Factor}_i)$

### E. Gate-to-Gate vs. Cradle-to-Gate Intensities
$$\text{Gate-to-Gate (Scope 1+2) Intensity} = \frac{\text{Scope 1} + \text{Scope 2}}{\text{Annual Output (Tonnes)}}$$
$$\text{Cradle-to-Gate (Scope 1+2+3) Footprint} = \frac{\text{Scope 1} + \text{Scope 2} + \text{Scope 3}}{\text{Annual Output (Tonnes)}}$$

> **⚠️ The SME Invariant:** Gate-to-Gate intensity is what a factory directly controls within its perimeter and is the **only part benchmarked against sector peers**. A machine shop that buys more raw steel per unit is not running a worse factory.

---

## 6. How It Predicts: The 3 Benchmark Leak Detection Rules

In `backend/engine/leaks.py`, the detector evaluates each stream against BEE MSME cluster distributions:
1. **Rule 1: Benchmark Breach (Severity: Critical / High)**  
   Triggered when plant energy intensity exceeds the **75th percentile (p75)** of sector peers.  
   $$\text{Severity Score} = \min \left( 1.0, \frac{\text{Actual} - p75}{p75} \right)$$
2. **Rule 2: Material Concentration (Severity: Moderate)**  
   Triggered when a stream represents **> 15% of total emissions** AND sits above the **50th percentile (p50 median)**.
3. **Rule 3: Structural Hotspot (Severity: Watch)**  
   Triggered when a stream represents **> 25% of total footprint** with no peer benchmark available (typically Scope 3 raw materials like steel or cotton).

---

## 7. The MACC Financial Optimization Engine

Located in `backend/engine/macc.py`.

### A. Capital Recovery Factor (CRF)
Turns a lump-sum capital expenditure into an annualized capital charge over asset lifespan $n$ at discount rate $r$:
$$CRF = \frac{r(1+r)^n}{(1+r)^n - 1}$$
*(Default $r = 0.12$, representing standard Indian MSME cost of capital).*

### B. Levelized Cost of Abatement (LCOA)
$$\text{LCOA } (₹/\text{tCO}_2\text{e}) = \frac{(CRF \times \text{Capex}) + \Delta\text{Opex} - \text{Gross Annual Saving}}{\text{Annual Abatement } (\text{tCO}_2\text{e})}$$

* **Negative LCOA ($< 0$):** Cash-positive project! The financial savings exceed the annualized capital cost. **The factory makes pure profit by going green.**
* **Positive LCOA ($> 0$):** Deep decarbonization project requiring capital investment.

### C. Simple Payback & NPV
$$\text{Net Annual Benefit (₹/yr)} = \text{Gross Energy Saving} - (CRF \times \text{Capex}) - \Delta\text{Opex}$$
$$\text{Simple Payback (Years)} = \frac{\text{Capex}}{\text{Gross Energy Saving} - \Delta\text{Opex}}$$
$$\text{NPV (₹)} = \sum_{t=1}^{n} \frac{\text{Net Cashflow}_t}{(1+r)^t} - \text{Capex}$$

---

## 8. Sector Inadmissibility: Blocked & Capped Rules

A recommendation engine loses executive credibility if it suggests technically possible but practically illegal or dangerous interventions:

| Sector | Intervention | Status | Reason |
| :--- | :--- | :--- | :--- |
| `pharma_formulation` | Recycled PET (`RPET_SUB`) | **BLOCKED** | Primary drug packaging in direct contact must meet US FDA/GMP regulations. Recycled resin is inadmissible without extensive stability testing. |
| `ceramics_tiles` | Biomass Boiler Switch (`BIOMASS_BOILER_SWITCH`) | **BLOCKED** | Tunnel kiln firing requires uniform high-temperature flame with zero ash carryover onto glazed tile surfaces. |
| `food_processing` | Recycled Resin (`RPET_SUB`) | **CAPPED AT 35%** | FSSAI food contact regulations restrict non-certified secondary resins; substitution is modeled strictly on secondary transit packaging. |
| `auto_components` | Secondary Steel Scrap (`STEEL_SCRAP_SUB`) | **CAPPED AT 45%** | Safety-critical fatigue components require OEM tensile specifications that uncertified secondary steel cannot guarantee. |

---

## 9. Regulatory Export Calculations: EU CBAM & SEBI BRSR

Located in `backend/engine/assess.py` (function `_compliance`):

$$\text{Exported Embedded Carbon } (\text{tCO}_2\text{e}) = (\text{Scope 1} + \text{Scope 2}) \times \text{EU Export Share } (\%)$$
$$\text{Indicative CBAM Exposure (₹)} = \text{Exported Embedded Carbon} \times \text{Reference Carbon Price (₹7,000 / tCO}_2\text{e)}$$

*Note:* Upstream Scope 3 precursor materials are strictly excluded from the screening figure because EU CBAM definitive rules require verified primary supplier declarations. Estimating precursor emissions would present a guess as a verified tax liability.

---

## 10. Backend Service Directory & File Map

| File Path | Core Function |
| :--- | :--- |
| `backend/engine/assess.py` | Master orchestrator compiling footprint, leaks, MACC, and CBAM in a single pass. |
| `backend/engine/footprint.py` | Scope 1/2/3 GHG accounting, stream decomposition, and intensity calculations. |
| `backend/engine/leaks.py` | 3-tier benchmark anomaly detector comparing against BEE MSME cluster quartiles. |
| `backend/engine/macc.py` | Financial economics, annualized Capex (CRF), LCOA calculation, and sector blocks. |
| `backend/engine/constants.py` | Physical constants, NCV values (GJ), industrial tariff defaults, and MSME discount rates. |
| `backend/app/schemas/factory.py` | Strict Pydantic contracts enforcing non-negative inputs and valid stream names. |
| `backend/app/services/report.py` | Server-side vector SVG chart generator and PDF working paper compiler via headless Chromium. |
| `backend/app/services/logistics_service.py` | Multi-factory freight pooling and modal shift routing. |
| `backend/app/services/ollama_service.py` | Private on-premise vision inference for bills and machine nameplates. |

---
*PRANGARA – The Industrial Decarbonization & Circularity Operating System.*
