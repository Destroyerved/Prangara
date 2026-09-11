# 05 — Database Schemas & Strictly Typed Data Layer

## Purpose & Use Case
Designed for software engineers, data architects, and backend developers implementing decarbonization platforms. Provides ready-to-run PostgreSQL / Supabase schemas and strictly typed datasets with zero typing ambiguity.

## Subdirectories
- **`sql/`**:
  - `chakra_decarbonization_schema.sql`: DDL statements with PRIMARY KEYs, FOREIGN KEYs, CHECK constraints, and indexes.
  - `chakra_decarbonization_seed_data.sql`: Production-ready SQL INSERT statements.
- **`json/`**: Strictly typed JSON with explicit numeric types, strings, arrays, and null-handling rules.
- **`csv/`**: Clean tabular exports for pandas, Excel, and analytics workflows.
- **`chakra_type_dictionary.json`**: Complete schema definition with units, precision, and physical boundaries.
