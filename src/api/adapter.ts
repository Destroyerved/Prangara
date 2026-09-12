/**
 * Integration boundary, intentionally explicit.
 * No backend source was supplied. These pass-through adapters expect the proposed
 * canonical schema in types/domain.ts. Map your real response here after inspection.
 * Never invent missing values, recompute economics, or silently use demo data.
 */
export const adaptAssessment = (raw: unknown): unknown => raw;
export const adaptSectors = (raw: unknown): unknown => raw;
export const adaptSector = (raw: unknown): unknown => raw;
export const adaptReference = (raw: unknown): unknown => raw;
