import { Inject, Injectable } from "@nestjs/common";
import type { ListUnitsQuery } from "@iot-management/types";
import { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";
import { tenantResourceNotFound } from "./portfolio-errors";

@Injectable()
export class UnitsService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
  ) {}

  create(context: RequestContext, dto: CreateUnitDto) {
    this.requireBuilding(context, dto.buildingId);
    if (dto.floorId) {
      const floor = this.requireFloor(context, dto.floorId);
      if (floor.buildingId !== dto.buildingId) {
        throw tenantResourceNotFound("Floor");
      }
    }

    return this.persistence.createUnit({
      organizationId: context.organization.id,
      buildingId: dto.buildingId,
      floorId: dto.floorId,
      name: dto.name,
      occupancyStatus: dto.occupancyStatus ?? "vacant",
    });
  }

  list(context: RequestContext, query: ListUnitsQuery = {}) {
    return {
      items: this.persistence.listUnits({
        organizationId: context.organization.id,
        buildingId: query.buildingId,
        floorId: query.floorId,
      }),
    };
  }

  get(context: RequestContext, unitId: string) {
    const unit = this.persistence.findUnitById(context.organization.id, unitId);
    if (!unit) {
      throw tenantResourceNotFound("Unit");
    }
    return unit;
  }

  update(context: RequestContext, unitId: string, dto: UpdateUnitDto) {
    if (dto.floorId) {
      this.requireFloor(context, dto.floorId);
    }
    const unit = this.persistence.updateUnit(
      context.organization.id,
      unitId,
      dto,
    );
    if (!unit) {
      throw tenantResourceNotFound("Unit");
    }
    return unit;
  }

  private requireBuilding(context: RequestContext, buildingId: string) {
    const building = this.persistence.findBuildingById(
      context.organization.id,
      buildingId,
    );
    if (!building) {
      throw tenantResourceNotFound("Building");
    }
  }

  private requireFloor(context: RequestContext, floorId: string) {
    const floor = this.persistence.findFloorById(
      context.organization.id,
      floorId,
    );
    if (!floor) {
      throw tenantResourceNotFound("Floor");
    }
    return floor;
  }
}
