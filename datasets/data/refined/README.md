# PRANGARA Refined Data Layer

## Overview
This directory contains the strictly typed, cryptographically verified, and normalized datasets for the **PRANGARA Industrial Decarbonization Intelligence Platform (PS10)**.

Every data record adheres to the **Four-Tier Authenticity Hierarchy**:
- 🟢 **Tier A: Official/Statutory Primary** (CEA Grid v22, BEE MSME Benchmarks, Gazette Rules, BIS Specifications)
- 🔵 **Tier B: First-Party / Industry Association LCI** (Worldsteel, International Aluminium Institute, Textile Exchange, GCCA Cement, PlasticsEurope, CEPI Paper)
- 🟡 **Tier C: Derived Transparent Engineering Models** (IPCC Coal G1-G17 NCV Models, OSRM Multi-Modal Logistics, Landfill Methane First-Order Decay)
- 🟠 **Tier D: Screening Literature Priors** (Explicitly flagged as `SCREENING_ONLY` or `VERIFIED_OFFICIAL_SCREENING`, never fabricated)

## Directory Structure
```
data/refined/
├── csv/
│   ├── chakra_emission_factors_refined.csv (& emission_factors_refined.csv)
│   ├── chakra_interventions_refined.csv (& interventions_refined.csv)
│   ├── chakra_sectors_refined.csv (& sectors_refined.csv)
│   ├── chakra_sector_benchmarks_refined.csv (& sector_benchmarks_refined.csv)
│   ├── chakra_material_lci_refined.csv (& material_lci_refined.csv)
│   ├── chakra_marketplace_refined.csv (& marketplace_refined.csv)
│   ├── chakra_providers_refined.csv (& providers_refined.csv)
│   ├── chakra_transport_factors_refined.csv (& transport_factors_refined.csv)
│   ├── chakra_circular_byproducts_refined.csv
│   ├── chakra_fleet_listings_refined.csv
│   └── chakra_compliance_rules_refined.csv
├── json/
│   ├── [Dual JSON formats corresponding to all CSV tables]
├── sql/
│   ├── chakra_schema.sql (& schema.sql): Complete PostgreSQL + PostGIS DDL with Foreign Keys & Indexes
│   └── chakra_seed_data.sql (& seed_data.sql): Idempotent seed data with ON CONFLICT DO NOTHING
├── type_dictionary.json: Schema specifications, column types, units, and ranges
└── README.md
```

## Quick Start (PostgreSQL)
```bash
psql -U postgres -d prangara -f sql/chakra_schema.sql
psql -U postgres -d prangara -f sql/chakra_seed_data.sql
```
