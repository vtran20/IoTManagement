import type { HealthResponse } from "@iot-management/types";
import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      dependencies: {
        api: { status: "ok" },
        postgres: { status: "ok" },
        redis: { status: "ok" },
      },
      service: "iot-management-api",
      status: "ok",
    };
  }
}
