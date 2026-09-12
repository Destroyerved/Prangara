# PRANGARA — Industrial Carbon Intelligence Network
## Problem Statement: HackOut'26 PS10 — Industrial Emission Leak-Point Detector & Circular Alternative Recommender

PRANGARA provides an authoritative, mathematically verified data architecture and software engine for industrial emission leak detection, circular alternative matching, and regulatory compliance.

### Authenticity Policy
Every number within PRANGARA conforms to our strict four-tier classification:
- **🟢 OFFICIAL / PRIMARY REFERENCE**: Direct government, regulator, standard owner, or scientific benchmark (CEA, DESNZ, IPCC, BEE, worldsteel, IAI).
- **🔵 FIRST-PARTY / OPERATOR REPORTED**: Real plant activity data, supplier stock/prices, and provider availability.
- **🟡 PRANGARA CALCULATED / DERIVED**: Transparent, deterministic calculations (Coal NCV conversions, OSRM transport carbon, MACC payback).
- **🟠 SCREENING / LITERATURE-DERIVED**: Published empirical ranges for screening where site measurements are pending.

### Dataset Directory Layout [`datasets/`](./datasets/)
- **[`01_statutory_emission_baselines/`](./datasets/01_statutory_emission_baselines/)**: Official CEA Grid, DESNZ Fuels, IPCC Combustion baselines.
- **[`02_circular_interventions_library/`](./datasets/02_circular_interventions_library/)**: 30 verified MACC interventions with DPR citations and CAPEX.
- **[`03_industrial_sector_benchmarks/`](./datasets/03_industrial_sector_benchmarks/)**: 10 SME sector SEC benchmarks from BEE cluster studies.
- **[`04_derived_engineering_models/`](./datasets/04_derived_engineering_models/)**: Coal G1-G17 NCV models, State Grid mixes, OSRM route emissions.
- **[`05_database_and_typed_layer/`](./datasets/05_database_and_typed_layer/)**: Strictly typed CSV, JSON, and PostgreSQL PostGIS DDL/Seed scripts.
- **[`06_auditing_and_proofs/`](./datasets/06_auditing_and_proofs/)**: SHA-256 Checksums, Source Registry, and Source Extractions.
- **[`07_primary_raw_sources/`](./datasets/07_primary_raw_sources/)**: Primary government PDFs, spreadsheets, and reference records.
- **[`08_automated_test_suites/`](./datasets/08_automated_test_suites/)**: Verification test suites guaranteeing invariant mathematical integrity.
- **[`09_operational_marketplace/`](./datasets/09_operational_marketplace/)**: Live circular raw material listings, verified providers, and M&V plans.
- **[`10_rag_knowledge_base/`](./datasets/10_rag_knowledge_base/)**: Traceable, page/section-aware text chunks for LLM audit queries.

---
*Built in strict compliance with `PRANGARA_Authentic_Data_Sources_Acquisition_Extraction_Plan.md`.*
