import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@iot-management/types";

@Controller("health")
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "iot-management-api",
    };
  }
}
