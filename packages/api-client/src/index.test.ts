import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./index";

describe("createApiClient", () => {
  it("requests the versioned health endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", service: "iot-management-api" }),
    });

    const client = createApiClient({
      baseUrl: "http://localhost:3001/",
      fetcher,
    });

    await expect(client.health()).resolves.toEqual({
      status: "ok",
      service: "iot-management-api",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("requests monthly usage reports with query parameters", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rows: [], totals: {} }),
    });

    const client = createApiClient({
      baseUrl: "http://localhost:3001/",
      fetcher,
    });

    await client.reports.monthlyUsage({ month: "2026-06" });

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/reports/monthly-usage?month=2026-06",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
