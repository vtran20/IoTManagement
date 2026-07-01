import type { UtilityRatesResponse } from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { UpdateUtilityRatesDto } from "./dto/update-utility-rates.dto";

@Injectable()
export class SettingsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  rates(context: RequestContext): Promise<UtilityRatesResponse> {
    return Promise.resolve(
      this.persistence.getUtilityRates(context.organization.id),
    );
  }

  async updateRates(
    context: RequestContext,
    dto: UpdateUtilityRatesDto,
  ): Promise<UtilityRatesResponse> {
    const current = await this.persistence.getUtilityRates(
      context.organization.id,
    );
    const waterPerGallon = dto.waterPerGallon ?? current.waterPerGallon;
    const electricPerKwh = dto.electricPerKwh ?? current.electricPerKwh;
    assertRate("waterPerGallon", waterPerGallon);
    assertRate("electricPerKwh", electricPerKwh);
    return await this.persistence.upsertUtilityRates({
      electricPerKwh,
      organizationId: context.organization.id,
      waterPerGallon,
    });
  }
}

function assertRate(field: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError(
      "INVALID_UTILITY_RATE",
      `${field} must be a non-negative number`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
