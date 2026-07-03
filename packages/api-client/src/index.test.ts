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

  it("requests typed water incident and repair work-order endpoints", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
    const client = createApiClient({
      baseUrl: "http://localhost:3001/",
      fetcher,
    });

    await client.incidents.list({ source: "meter_anomaly" });
    await client.workOrders.list({ overdue: true, priority: "critical" });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3001/api/v1/incidents?source=meter_anomaly",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3001/api/v1/work-orders?overdue=true&priority=critical",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
