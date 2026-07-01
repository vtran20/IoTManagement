import { Inject, Injectable } from "@nestjs/common";
import type { ListUnitsQuery } from "@iot-management/types";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";
import { parentArchived, tenantResourceNotFound } from "./portfolio-errors";

@Injectable()
export class UnitsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async create(context: RequestContext, dto: CreateUnitDto) {
    await this.requireActiveBuilding(context, dto.buildingId);
    if (dto.floorId) {
      const floor = await this.requireFloor(context, dto.floorId);
      if (floor.buildingId !== dto.buildingId) {
        throw tenantResourceNotFound("Floor");
      }
      if ((floor.lifecycleStatus ?? "active") === "archived") {
        throw parentArchived("Floor");
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

  async list(context: RequestContext, query: ListUnitsQuery = {}) {
    return {
      items: await this.persistence.listUnits({
        organizationId: context.organization.id,
        buildingId: query.buildingId,
        floorId: query.floorId,
      }),
    };
  }

  async get(context: RequestContext, unitId: string) {
    const unit = await this.persistence.findUnitById(
      context.organization.id,
      unitId,
    );
    if (!unit) {
      throw tenantResourceNotFound("Unit");
    }
    return unit;
  }

  async update(context: RequestContext, unitId: string, dto: UpdateUnitDto) {
    const existing = await this.persistence.findUnitById(
      context.organization.id,
      unitId,
    );
    if (!existing) {
      throw tenantResourceNotFound("Unit");
    }
    if (dto.floorId) {
      const floor = await this.requireFloor(context, dto.floorId);
      if (floor.buildingId !== existing.buildingId) {
        throw tenantResourceNotFound("Floor");
      }
      if ((floor.lifecycleStatus ?? "active") === "archived") {
        throw parentArchived("Floor");
      }
    }
    const unit = await this.persistence.updateUnit(
      context.organization.id,
      unitId,
      dto,
    );
    if (!unit) {
      throw tenantResourceNotFound("Unit");
    }
    return unit;
  }

  async archive(context: RequestContext, unitId: string) {
    return this.setLifecycle(context, unitId, "archived");
  }

  async restore(context: RequestContext, unitId: string) {
    return this.setLifecycle(context, unitId, "active");
  }

  private async setLifecycle(
    context: RequestContext,
    unitId: string,
    lifecycleStatus: "active" | "archived",
  ) {
    const unit = await this.persistence.updateUnit(
      context.organization.id,
      unitId,
      {
        archivedAt:
          lifecycleStatus === "archived" ? new Date().toISOString() : undefined,
        lifecycleStatus,
      },
    );
    if (!unit) {
      throw tenantResourceNotFound("Unit");
    }
    return unit;
  }

  private async requireBuilding(context: RequestContext, buildingId: string) {
    const building = await this.persistence.findBuildingById(
      context.organization.id,
      buildingId,
    );
    if (!building) {
      throw tenantResourceNotFound("Building");
    }
    return building;
  }

  private async requireActiveBuilding(
    context: RequestContext,
    buildingId: string,
  ) {
    const building = await this.requireBuilding(context, buildingId);
    if ((building.lifecycleStatus ?? "active") === "archived") {
      throw parentArchived("Building");
    }
  }

  private async requireFloor(context: RequestContext, floorId: string) {
    const floor = await this.persistence.findFloorById(
      context.organization.id,
      floorId,
    );
    if (!floor) {
      throw tenantResourceNotFound("Floor");
    }
    return floor;
  }
}
