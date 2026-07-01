import { Controller, Get, HttpStatus, Inject } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { validateApiEnv } from "../config/env.schema";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

@Controller("dev")
export class DevController {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  @Get("email-outbox")
  async listEmailOutbox() {
    if (validateApiEnv().nodeEnv === "production") {
      throw new ApiError(
        "NOT_FOUND",
        "Resource not found",
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      items: await this.persistence.listEmailOutboxItems(),
    };
  }
}
