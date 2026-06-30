import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  it("returns the API health status", () => {
    const controller = new HealthController(new HealthService());

    expect(controller.getHealth()).toEqual({
      dependencies: {
        api: { status: "ok" },
        postgres: { status: "ok" },
        redis: { status: "ok" },
      },
      service: "iot-management-api",
      status: "ok",
    });
  });
});
