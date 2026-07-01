import { Controller, Get, Inject } from "@nestjs/common";
import type { HealthResponse } from "@iot-management/types";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(
    @Inject(HealthService)
    private readonly healthService: HealthService,
  ) {}

  @Get()
  getHealth(): Promise<HealthResponse> {
    return this.healthService.getHealth();
  }
}
