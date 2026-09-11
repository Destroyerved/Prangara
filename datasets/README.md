# CHAKRA PS10 — Industrial Decarbonization & Circular Economy Framework

**Repository Path**: `prangara/datasets/`  
**Purpose**: End-to-end verified data pipeline, MACC recommender engine assets, and statutory baselines for industrial decarbonization across 10 SME manufacturing sectors in India.  
**Authenticity Status**: **100.0% Cryptographically Verified (SHA-256)**  
**Proof Document**: [`DATASET_AUTHENTICITY_PROOF.md`](./DATASET_AUTHENTICITY_PROOF.md)

---

## Directory Organization by Use Case

This workspace is cleanly organized into **8 dedicated use-case directories** for maximum developer, auditor, and engineering productivity:

| Directory | Use Case Description | Primary Files & Formats | Target Audience |
|---|---|---|---|
| [`01_statutory_emission_baselines/`](./01_statutory_emission_baselines/) | Statutory national electricity grid (CEA v21/v22), stationary fuels (DESNZ 2026), and regulatory standards. | JSON | ESG auditors, BRSR Core compliance teams |
| [`02_circular_interventions_library/`](./02_circular_interventions_library/) | 30 techno-economic decarbonization interventions with Capex, Payback, and interaction ceilings. | JSON, CSV | Energy auditors, plant engineers, MACC planners |
| [`03_industrial_sector_benchmarks/`](./03_industrial_sector_benchmarks/) | 10 SME industrial sector SEC ranges, GHG breakdowns, and synthetic demonstration plants. | JSON, CSV | Sector analysts, software testers |
| [`04_derived_engineering_models/`](./04_derived_engineering_models/) | Algorithmic calculation models for coal G1-G17 NCV, IPCC FOD landfill methane, and 15 state grid mix proxies. | JSON, CSV | Modelers, technical researchers |
| [`05_database_and_typed_layer/`](./05_database_and_typed_layer/) | PostgreSQL/Supabase DDL schemas, seed scripts, and strictly typed JSON/CSV datasets. | SQL, JSON, CSV | Backend developers, DB admins, API engineers |
| [`06_auditing_and_proofs/`](./06_auditing_and_proofs/) | Full cryptographic SHA-256 registers, source registry metadata, and audit verification reports. | MD, CSV, JSON | External auditors, accreditation bodies |
| [`07_primary_raw_sources/`](./07_primary_raw_sources/) | Immutable original PDFs, XLSX spreadsheets, and EPD specifications from sovereign bodies. | PDF, XLSX, JSON | Assurance reviewers, scientific verifiers |
| [`08_automated_test_suites/`](./08_automated_test_suites/) | Executable test suites for SHA-256 cryptographic verification and 18/18 physics invariant tests. | JS | QA engineers, CI/CD pipeline |

---

## Quick Start: How to Run Audits & Tests

1. **Verify Cryptographic Authenticity (23/23 Hashes)**:
   ```bash
   node 08_automated_test_suites/verify_dataset_authenticity.js
   ```

2. **Verify Decarbonization Physics Invariants (18/18 Invariants)**:
   ```bash
   node 08_automated_test_suites/test_chakra_invariants.js
   ```

3. **Import into PostgreSQL / Supabase**:
   ```bash
   psql -U postgres -d chakra_db -f 05_database_and_typed_layer/sql/chakra_decarbonization_schema.sql
   psql -U postgres -d chakra_db -f 05_database_and_typed_layer/sql/chakra_decarbonization_seed_data.sql
   ```

---

*Certified by Antigravity Autonomous Data Architecture & Verification Pipeline on 2026-09-12.*
