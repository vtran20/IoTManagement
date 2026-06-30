import type {
  IngestReadingRequest,
  Meter,
  ReadingUnit,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";

const compatibleUnits: Record<Meter["utilityType"], ReadingUnit[]> = {
  electric: ["kwh"],
  water: ["gallon", "liter"],
};

@Injectable()
export class ReadingValidationService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
  ) {}

  validate(input: IngestReadingRequest & { meter: Meter }) {
    if (input.value < 0) {
      throw new ApiError(
        "INVALID_READING_VALUE",
        "Reading value must be greater than or equal to zero",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (input.utilityType !== input.meter.utilityType) {
      throw new ApiError(
        "INVALID_READING_UTILITY",
        "Reading utilityType must match the meter utilityType",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!compatibleUnits[input.meter.utilityType].includes(input.unit)) {
      throw new ApiError(
        "INVALID_READING_UNIT",
        "Reading unit is not compatible with the meter utilityType",
        HttpStatus.BAD_REQUEST,
      );
    }

    const measuredAt = new Date(input.measuredAt);
    if (Number.isNaN(measuredAt.getTime())) {
      throw new ApiError(
        "INVALID_READING_TIMESTAMP",
        "measuredAt must be a valid ISO timestamp",
        HttpStatus.BAD_REQUEST,
      );
    }

    const staleCutoff = new Date("2026-01-01T00:00:00.000Z");
    if (measuredAt < staleCutoff) {
      throw new ApiError(
        "STALE_READING_TIMESTAMP",
        "Reading timestamp is outside the accepted ingestion window",
        HttpStatus.BAD_REQUEST,
      );
    }

    const building = this.persistence.findBuildingById(
      input.meter.organizationId,
      input.meter.buildingId,
    );
    if (!building) {
      throw new ApiError(
        "INVALID_METER_ASSIGNMENT",
        "Meter building assignment is invalid",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
