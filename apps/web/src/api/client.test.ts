import { describe, it, expect, vi, afterEach } from "vitest";
import snapshots from "../data/assessments.json";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("API boundary", () => {
  it("keeps fixture mode fully local and refuses to calculate edited inputs", async () => {
    vi.stubEnv("VITE_DATA_MODE", "demo");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { api } = await import("./client");
    expect((await api.demo("textile_dyeing")).footprint.total.base).toBe(24069);
    await expect(
      api.assess({ ...snapshots.textile_dyeing.plant, electricity_kwh: 1 }),
    ).rejects.toThrow("New calculations require");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("passes assessment input and returned numbers without recalculation", async () => {
    vi.stubEnv("VITE_DATA_MODE", "api");
    const data = structuredClone(snapshots.textile_dyeing);
    data.footprint.total.base = 98765;
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const { api } = await import("./client");
    const result = await api.assess(snapshots.textile_dyeing.plant);
    expect(result.footprint.total.base).toBe(98765);
    expect(fetch.mock.calls[0][0]).toBe("/api/assess");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(
      snapshots.textile_dyeing.plant,
    );
  });
  it("reports contract mismatch rather than returning believable fallback data", async () => {
    vi.stubEnv("VITE_DATA_MODE", "api");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ total: 123 }), { status: 200 }),
        ),
    );
    const { api } = await import("./client");
    await expect(api.demo("textile_dyeing")).rejects.toThrow(
      "does not match the frontend contract",
    );
  });
  it("reports server and network errors without falling back to fixtures", async () => {
    vi.stubEnv("VITE_DATA_MODE", "api");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockRejectedValueOnce(new TypeError("network"));
    vi.stubGlobal("fetch", fetch);
    const { api } = await import("./client");
    await expect(api.demo("textile_dyeing")).rejects.toThrow(
      "could not complete",
    );
    await expect(api.demo("textile_dyeing")).rejects.toThrow("unavailable");
  });
});

describe("access failures", () => {
  it.each([
    [401, "session"],
    [403, "Permission denied"],
  ])(
    "preserves status %s without fixture fallback",
    async (status, message) => {
      vi.stubEnv("VITE_DATA_MODE", "api");
      const fetch = vi.fn().mockResolvedValue(new Response("", { status }));
      vi.stubGlobal("fetch", fetch);
      const { api } = await import("./client");
      await expect(api.demo("textile_dyeing")).rejects.toMatchObject({
        status,
        message: expect.stringContaining(message),
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
});

describe("live engine response adaptation", () => {
  it("adapts a live FastAPI engine assessment response cleanly into domain schema", async () => {
    vi.stubEnv("VITE_DATA_MODE", "api");
    const scratch = await import("../data/live_engine_fixture.json");
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(scratch.default), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const { api } = await import("./client");
    const res = await api.demo("textile_dyeing");
    expect(Math.round(res.footprint.total.base)).toBe(24069);
    expect(res.footprint.scopes).toHaveLength(3);
    expect(res.recommendations.items.length).toBeGreaterThan(0);
    expect(res.recommendations.portfolios.all.curve.length).toBeGreaterThan(0);
    expect(res.leaks.findings.length).toBeGreaterThan(0);
    expect(res.sankey.nodes.length).toBeGreaterThan(0);
    expect(res.sankey.links.length).toBeGreaterThan(0);
  });

  it("adapts live grouped reference registry into canonical factor array", async () => {
    vi.stubEnv("VITE_DATA_MODE", "api");
    const rawRef = {
      meta: { count: 2 },
      groups: {
        Fuel: [
          {
            key: "COAL_INDIAN",
            label: "Indian steam coal",
            value: 2.45,
            low: 2.2,
            high: 2.7,
            unit: "kgCO2e/kg",
            scope: 1,
            source: "CEA",
          },
        ],
        Electricity: [
          {
            key: "GRID_TAMIL_NADU",
            label: "Tamil Nadu Grid",
            value: 0.82,
            unit: "kgCO2e/kWh",
            scope: 2,
            source: "CEA",
          },
        ],
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(rawRef), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { api } = await import("./client");
    const factors = await api.reference();
    expect(factors).toHaveLength(2);
    expect(factors[0].key).toBe("COAL_INDIAN");
    expect(factors[0].scope).toBe("1");
    expect(factors[1].scope).toBe("2");
  });
});

