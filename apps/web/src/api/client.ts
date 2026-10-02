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
  toEngineProfile,
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
  reference: async (signal?: AbortSignal, connected = false) =>
    dataMode === "demo" && !connected
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
    const [result, sector] = await Promise.all([
      request("/demo/" + encodeURIComponent(key), {}, signal),
      request("/sectors/" + encodeURIComponent(key), {}, signal),
    ]);
    const source = z.object({demo_profile:z.record(z.string(),z.unknown())}).parse(sector);
    return parse(assessmentSchema, adaptAssessment(result, {...source.demo_profile,sector:key,eu_export_share_pct:25}));
  },
  assess: async (profile: PlantProfile) => {
    plantSchema.parse(profile);
    try {
      const response = await request("/assess", {
        method: "POST",
        body: JSON.stringify(toEngineProfile(profile)),
      });
      return parse(assessmentSchema, adaptAssessment(response, profile));
    } catch (e) {
      if (dataMode === "demo") {
        throw new ApiError(
          "Inputs validated. Calculation engine is starting or unreachable. Please ensure the backend is running at http://127.0.0.1:8000.",
        );
      }
      throw e;
    }
  },
};
