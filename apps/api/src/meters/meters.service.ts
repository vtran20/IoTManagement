import type {
  ListMetersQuery,
  MeterResponse,
  ReadingUnit,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import { CreateMeterDto } from "./dto/create-meter.dto";
import { UpdateMeterDto } from "./dto/update-meter.dto";

@Injectable()
export class MetersService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async create(
    context: RequestContext,
    dto: CreateMeterDto,
  ): Promise<MeterResponse> {
    await this.validateAssignment(
      context,
      dto.buildingId,
      dto.floorId,
      dto.unitId,
    );

    if (
      await this.persistence.findMeterByExternalId(
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
      await this.persistence.createMeter({
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

  async list(context: RequestContext, query: ListMetersQuery = {}) {
    return {
      items: (
        await this.persistence.listMeters({
          organizationId: context.organization.id,
          buildingId: query.buildingId,
          unitId: query.unitId,
          status: query.status,
          utilityType: query.utilityType,
        })
      ).map((meter) => this.withSupportedReadingUnits(meter)),
    };
  }

  async get(context: RequestContext, meterId: string): Promise<MeterResponse> {
    const meter = await this.persistence.findMeterById(
      context.organization.id,
      meterId,
    );
    if (!meter) {
      throw tenantResourceNotFound("Meter");
    }
    return this.withSupportedReadingUnits(meter);
  }

  async update(
    context: RequestContext,
    meterId: string,
    dto: UpdateMeterDto,
  ): Promise<MeterResponse> {
    const existing = await this.persistence.findMeterById(
      context.organization.id,
      meterId,
    );
    if (!existing) {
      throw tenantResourceNotFound("Meter");
    }
    await this.validateAssignment(
      context,
      existing.buildingId,
      dto.floorId ?? existing.floorId,
      dto.unitId ?? existing.unitId,
    );

    const meter = await this.persistence.updateMeter(
      context.organization.id,
      meterId,
      dto,
    );
    if (!meter) {
      throw tenantResourceNotFound("Meter");
    }
    return this.withSupportedReadingUnits(meter);
  }

  private async validateAssignment(
    context: RequestContext,
    buildingId: string,
    floorId?: string,
    unitId?: string,
  ) {
    const building = await this.persistence.findBuildingById(
      context.organization.id,
      buildingId,
    );
    if (!building) {
      throw tenantResourceNotFound("Building");
    }

    if (floorId) {
      const floor = await this.persistence.findFloorById(
        context.organization.id,
        floorId,
      );
      if (!floor || floor.buildingId !== buildingId) {
        throw tenantResourceNotFound("Floor");
      }
    }

    if (unitId) {
      const unit = await this.persistence.findUnitById(
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
