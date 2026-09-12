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
    const { tariff, ...rest } = snapshots.textile_dyeing.plant;
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      ...rest,
      tariff_inr_per_kwh: tariff,
    });
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
    await expect(api.demo("textile_dyeing")).rejects.toThrow();
  });
  it("reports server and network errors without falling back to fixtures", async () => {
    vi.stubEnv("VITE_DATA_MODE", "api");
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    const { api } = await import("./client");
    await expect(api.demo("textile_dyeing")).rejects.toThrow(
      "could not complete",
    );
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
      expect(fetch.mock.calls.length).toBeGreaterThanOrEqual(1);
    },
  );
});
