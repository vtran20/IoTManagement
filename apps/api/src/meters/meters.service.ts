import type {
  ListMetersQuery,
  MeterResponse,
  ReadingUnit,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import { CreateMeterDto } from "./dto/create-meter.dto";
import { UpdateMeterDto } from "./dto/update-meter.dto";

@Injectable()
export class MetersService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
  ) {}

  create(context: RequestContext, dto: CreateMeterDto): MeterResponse {
    this.validateAssignment(context, dto.buildingId, dto.floorId, dto.unitId);

    if (
      this.persistence.findMeterByExternalId(
        context.organization.id,
        dto.externalId,
      )
    ) {
      throw new ApiError(
        "METER_EXTERNAL_ID_EXISTS",
        "Meter externalId already exists in this organization",
        HttpStatus.CONFLICT,
      );
    }

    return this.withSupportedReadingUnits(
      this.persistence.createMeter({
        organizationId: context.organization.id,
        buildingId: dto.buildingId,
        floorId: dto.floorId,
        unitId: dto.unitId,
        utilityType: dto.utilityType,
        source: dto.source,
        externalId: dto.externalId,
        installedAt: dto.installedAt,
      }),
    );
  }

  list(context: RequestContext, query: ListMetersQuery = {}) {
    return {
      items: this.persistence
        .listMeters({
          organizationId: context.organization.id,
          buildingId: query.buildingId,
          unitId: query.unitId,
          status: query.status,
          utilityType: query.utilityType,
        })
        .map((meter) => this.withSupportedReadingUnits(meter)),
    };
  }

  get(context: RequestContext, meterId: string): MeterResponse {
    const meter = this.persistence.findMeterById(
      context.organization.id,
      meterId,
    );
    if (!meter) {
      throw tenantResourceNotFound("Meter");
    }
    return this.withSupportedReadingUnits(meter);
  }

  update(
    context: RequestContext,
    meterId: string,
    dto: UpdateMeterDto,
  ): MeterResponse {
    const existing = this.persistence.findMeterById(
      context.organization.id,
      meterId,
    );
    if (!existing) {
      throw tenantResourceNotFound("Meter");
    }
    this.validateAssignment(
      context,
      existing.buildingId,
      dto.floorId ?? existing.floorId,
      dto.unitId ?? existing.unitId,
    );

    const meter = this.persistence.updateMeter(
      context.organization.id,
      meterId,
      dto,
    );
    if (!meter) {
      throw tenantResourceNotFound("Meter");
    }
    return this.withSupportedReadingUnits(meter);
  }

  private validateAssignment(
    context: RequestContext,
    buildingId: string,
    floorId?: string,
    unitId?: string,
  ) {
    const building = this.persistence.findBuildingById(
      context.organization.id,
      buildingId,
    );
    if (!building) {
      throw tenantResourceNotFound("Building");
    }

    if (floorId) {
      const floor = this.persistence.findFloorById(
        context.organization.id,
        floorId,
      );
      if (!floor || floor.buildingId !== buildingId) {
        throw tenantResourceNotFound("Floor");
      }
    }

    if (unitId) {
      const unit = this.persistence.findUnitById(
        context.organization.id,
        unitId,
      );
      if (!unit || unit.buildingId !== buildingId) {
        throw tenantResourceNotFound("Unit");
      }
    }
  }

  private withSupportedReadingUnits(
    meter: Omit<MeterResponse, "supportedReadingUnits">,
  ): MeterResponse {
    const supportedReadingUnits: ReadingUnit[] =
      meter.utilityType === "water" ? ["gallon", "liter"] : ["kwh"];
    return {
      ...meter,
      supportedReadingUnits,
    };
  }
}
