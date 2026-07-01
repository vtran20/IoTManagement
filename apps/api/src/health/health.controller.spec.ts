import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  it("returns dependency health from real checks", async () => {
    const controller = new HealthController(
      new HealthService(undefined, {
        postgres: async () => "ok",
        redis: async () => "ok",
      }),
    );

    await expect(controller.getHealth()).resolves.toEqual({
      dependencies: {
        api: { status: "ok" },
        postgres: { status: "ok" },
        redis: { status: "ok" },
      },
      service: "iot-management-api",
      status: "ok",
    });
  });

  it("marks PostgreSQL as degraded when the database check fails", async () => {
    const controller = new HealthController(
      new HealthService(undefined, {
        postgres: async () => "degraded",
        redis: async () => "ok",
      }),
    );

    await expect(controller.getHealth()).resolves.toEqual({
      dependencies: {
        api: { status: "ok" },
        postgres: { status: "degraded" },
        redis: { status: "ok" },
      },
      service: "iot-management-api",
      status: "ok",
    });
  });
});
