import { z } from "zod";
import { plantSchema, type PlantProfile } from "../types/domain";

// Local file format only. Reuse the existing profile; never serialize an assessment.
// Unfinished identity/output may be saved, but final submission uses plantSchema.
const draftSchema = plantSchema
  .extend({
    name: z.string().max(500),
    annual_output_t: z.number().finite().nonnegative(),
  })
  .strict();
export const MAX_DRAFT_BYTES = 1024 * 1024;

export function parsePlantDraft(text: string): PlantProfile {
  if (new TextEncoder().encode(text).byteLength > MAX_DRAFT_BYTES)
    throw new Error("Choose a PRANGARA input draft smaller than 1 MB.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(
      "This file is not readable JSON. Choose a saved PRANGARA input draft.",
    );
  }
  const result = draftSchema.safeParse(raw);
  if (!result.success)
    throw new Error(
      "This is not a supported input draft. Check the profile fields and numeric values; assessment exports cannot be restored as drafts.",
    );
  return result.data;
}
