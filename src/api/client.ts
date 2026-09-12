import { z } from "zod";
import {
  assessmentSchema,
  factorSchema,
  sectorSchema,
  plantSchema,
  type PlantProfile,
} from "../types/domain";
import rawFixtures from "../data/assessments.json";
import rawReference from "../data/reference.json";
import rawSectors from "../data/sectors.json";
export const dataMode =
  import.meta.env.VITE_DATA_MODE === "api" ? "api" : "demo";
const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
async function request(
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal,
): Promise<unknown> {
  const timeout = AbortSignal.timeout(15000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(base + path, {
      ...options,
      signal: combined,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError(
      "The assessment service is unavailable. Check your backend connection and retry.",
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status === 401
        ? "Your session is unavailable or has expired. Sign in through your configured authentication service."
        : response.status === 403
          ? "Permission denied. Your account cannot access this resource."
          : response.status === 422
            ? "The engine rejected this profile. Review the input values."
            : "The assessment service could not complete this request.",
      response.status,
    );
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      "The service returned an unreadable response. Check the API adapter.",
    );
  }
}
function parse<T>(schema: z.ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success)
    throw new ApiError(
      "The response does not match the frontend contract. Update src/api/adapter.ts to match your engine.",
    );
  return result.data;
}
const sectors = parse(z.array(sectorSchema), rawSectors);
const fixtures = parse(z.record(z.string(), assessmentSchema), rawFixtures);
const reference = parse(z.array(factorSchema), rawReference);
import {
  adaptAssessment,
  adaptSectors,
  adaptSector,
  adaptReference,
} from "./adapter";
export const api = {
  health: async (signal?: AbortSignal) =>
    dataMode === "demo"
      ? { status: "development_fixture" }
      : request("/health", {}, signal),
  sectors: async (signal?: AbortSignal) =>
    dataMode === "demo"
      ? sectors
      : parse(
          z.array(sectorSchema),
          adaptSectors(await request("/sectors", {}, signal)),
        ),
  sector: async (key: string, signal?: AbortSignal) => {
    if (dataMode === "demo") {
      const s = sectors.find((x) => x.key === key);
      if (!s) throw new ApiError("Sector unavailable.");
      return s;
    }
    return parse(
      sectorSchema,
      adaptSector(
        await request("/sector/" + encodeURIComponent(key), {}, signal),
      ),
    );
  },
  reference: async (signal?: AbortSignal) =>
    dataMode === "demo"
      ? reference
      : parse(
          z.array(factorSchema),
          adaptReference(await request("/reference", {}, signal)),
        ),
  demo: async (key: string, signal?: AbortSignal) => {
    if (dataMode === "demo") {
      const a = fixtures[key];
      if (!a) throw new ApiError("This demo is unavailable.");
      return structuredClone(a);
    }
    return parse(
      assessmentSchema,
      adaptAssessment(
        await request("/demo/" + encodeURIComponent(key), {}, signal),
      ),
    );
  },
  assess: async (profile: PlantProfile) => {
    plantSchema.parse(profile);
    if (dataMode === "demo")
      throw new ApiError(
        "Inputs validated. New calculations require the connected engine. You can export these inputs or load a fixed demo assessment.",
      );
    return parse(
      assessmentSchema,
      adaptAssessment(
        await request("/assess", {
          method: "POST",
          body: JSON.stringify(profile),
        }),
      ),
    );
  },
};
