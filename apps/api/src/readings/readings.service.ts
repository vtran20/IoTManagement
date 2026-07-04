import type {
  IngestReadingResponse,
  ListReadingsQuery,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import { MeterHealthService } from "../meters/meter-health.service";
import { LeakDetectionService } from "../incidents/leak-detection.service";
import { LeakBaselineDetectionService } from "../incidents/leak-baseline-detection.service";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import { IngestReadingDto } from "./dto/ingest-reading.dto";
import { ReadingValidationService } from "./reading-validation.service";

@Injectable()
export class ReadingsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(ReadingValidationService)
    private readonly validation: ReadingValidationService,
    @Inject(MeterHealthService)
    private readonly meterHealth: MeterHealthService,
    @Inject(LeakDetectionService)
    private readonly leakDetection: LeakDetectionService,
    @Inject(LeakBaselineDetectionService)
    private readonly baselineDetection: LeakBaselineDetectionService,
  ) {}

  async ingest(
    context: RequestContext,
    dto: IngestReadingDto,
  ): Promise<IngestReadingResponse> {
    const meter = await this.persistence.findMeterByExternalId(
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

    await this.validation.validate({ ...dto, meter });

    const duplicate = await this.persistence.findReadingByMeterAndMeasuredAt(
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

    const reading = await this.persistence.createReading({
      organizationId: context.organization.id,
      meterId: meter.id,
      measuredAt: dto.measuredAt,
      utilityType: dto.utilityType,
      value: dto.value,
      unit: dto.unit,
      readingKind: dto.readingKind,
      receivedAt: new Date().toISOString(),
    });

    await this.meterHealth.markReadingAccepted({
      organizationId: context.organization.id,
      meterId: meter.id,
      measuredAt: dto.measuredAt,
    });
    await this.leakDetection.evaluateAcceptedReading({
      meter,
      organizationId: context.organization.id,
      reading,
    });
    await this.baselineDetection.evaluateAcceptedReading({
      meter,
      organizationId: context.organization.id,
      reading,
    });

    return {
      reading,
      accepted: true,
      duplicate: false,
    };
  }

  async listByMeter(
    context: RequestContext,
    meterId: string,
    query: ListReadingsQuery,
  ) {
    const meter = await this.persistence.findMeterById(
      context.organization.id,
      meterId,
    );
    if (!meter) {
      throw tenantResourceNotFound("Meter");
    }

    return {
      items: await this.persistence.listReadings({
        organizationId: context.organization.id,
        meterId,
        from: query?.from,
        to: query?.to,
      }),
    };
  }
}
