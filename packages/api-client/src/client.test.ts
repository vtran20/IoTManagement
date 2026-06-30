import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./client";

describe("createApiClient", () => {
  it("prefixes requests with /api/v1 exactly once", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const client = createApiClient({
      baseUrl: "http://localhost:3001/api/v1/",
      fetcher,
    });

    await client.get("/buildings");

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/buildings",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("serializes query parameters predictably", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const client = createApiClient({
      baseUrl: "http://localhost:3001",
      fetcher,
    });

    await client.get("/meters", {
      query: {
        buildingId: "building_1",
        cursor: undefined,
        status: "online",
        utilityType: "water",
      },
    });

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/meters?buildingId=building_1&status=online&utilityType=water",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("adds bearer auth when a token is provided", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "building_1" }),
    });

    const client = createApiClient({
      authToken: "test-token",
      baseUrl: "http://localhost:3001",
      fetcher,
    });

    await client.post("/buildings", {
      body: { name: "North Tower", timezone: "America/Detroit" },
    });

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/buildings",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer test-token",
          "content-type": "application/json",
        }),
        method: "POST",
      }),
    );
  });
});
