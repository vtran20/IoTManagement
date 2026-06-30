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
    expect(fetcher).toHaveBeenCalledWith("http://localhost:3001/api/v1/health");
  });
});
