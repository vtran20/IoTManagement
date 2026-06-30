import type {
  IngestReadingResponse,
  ListReadingsQuery,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import { MeterHealthService } from "../meters/meter-health.service";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import { IngestReadingDto } from "./dto/ingest-reading.dto";
import { ReadingValidationService } from "./reading-validation.service";

@Injectable()
export class ReadingsService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
    @Inject(ReadingValidationService)
    private readonly validation: ReadingValidationService,
    @Inject(MeterHealthService)
    private readonly meterHealth: MeterHealthService,
  ) {}

  ingest(
    context: RequestContext,
    dto: IngestReadingDto,
  ): IngestReadingResponse {
    const meter = this.persistence.findMeterByExternalId(
      context.organization.id,
      dto.meterExternalId,
    );
    if (!meter) {
      throw new ApiError(
        "UNKNOWN_METER",
        "Meter externalId was not found in the authenticated tenant scope",
        HttpStatus.NOT_FOUND,
      );
    }

    this.validation.validate({ ...dto, meter });

    const duplicate = this.persistence.findReadingByMeterAndMeasuredAt(
      context.organization.id,
      meter.id,
      dto.measuredAt,
    );
    if (duplicate) {
      return {
        reading: duplicate,
        accepted: false,
        duplicate: true,
      };
    }

    const reading = this.persistence.createReading({
      organizationId: context.organization.id,
      meterId: meter.id,
      measuredAt: dto.measuredAt,
      utilityType: dto.utilityType,
      value: dto.value,
      unit: dto.unit,
      readingKind: dto.readingKind,
      receivedAt: new Date().toISOString(),
    });

    this.meterHealth.markReadingAccepted({
      organizationId: context.organization.id,
      meterId: meter.id,
      measuredAt: dto.measuredAt,
    });

    return {
      reading,
      accepted: true,
      duplicate: false,
    };
  }

  listByMeter(
    context: RequestContext,
    meterId: string,
    query: ListReadingsQuery,
  ) {
    const meter = this.persistence.findMeterById(
      context.organization.id,
      meterId,
    );
    if (!meter) {
      throw tenantResourceNotFound("Meter");
    }

    return {
      items: this.persistence.listReadings({
        organizationId: context.organization.id,
        meterId,
        from: query?.from,
        to: query?.to,
      }),
    };
  }
}
