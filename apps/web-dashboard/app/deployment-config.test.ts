import { afterEach, describe, expect, it, vi } from "vitest";

describe("dashboard deployment API base URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults browser API calls to the Kubernetes ingress API path", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.resetModules();

    const { apiBaseUrl } = await import("../lib/auth-client");

    expect(apiBaseUrl).toBe("/api/v1");
  });
});
