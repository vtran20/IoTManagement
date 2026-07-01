import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { CreateFloorDto } from "./dto/create-floor.dto";
import { UpdateFloorDto } from "./dto/update-floor.dto";
import { parentArchived, tenantResourceNotFound } from "./portfolio-errors";

@Injectable()
export class FloorsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async create(context: RequestContext, dto: CreateFloorDto) {
    await this.requireActiveBuilding(context, dto.buildingId);
    return this.persistence.createFloor({
      organizationId: context.organization.id,
      buildingId: dto.buildingId,
      name: dto.name,
      level: dto.level,
    });
  }

  async list(context: RequestContext, query: { buildingId?: string }) {
    if (query.buildingId) {
      await this.requireBuilding(context, query.buildingId);
    }
    return {
      items: await this.persistence.listFloors(
        context.organization.id,
        query.buildingId,
      ),
    };
  }

  async get(context: RequestContext, floorId: string) {
    const floor = await this.persistence.findFloorById(
      context.organization.id,
      floorId,
    );
    if (!floor) {
      throw tenantResourceNotFound("Floor");
    }
    return floor;
  }

  async update(context: RequestContext, floorId: string, dto: UpdateFloorDto) {
    const floor = await this.persistence.updateFloor(
      context.organization.id,
      floorId,
      dto,
    );
    if (!floor) {
      throw tenantResourceNotFound("Floor");
    }
    return floor;
  }

  async archive(context: RequestContext, floorId: string) {
    return this.setLifecycle(context, floorId, "archived");
  }

  async restore(context: RequestContext, floorId: string) {
    return this.setLifecycle(context, floorId, "active");
  }

  private async setLifecycle(
    context: RequestContext,
    floorId: string,
    lifecycleStatus: "active" | "archived",
  ) {
    const floor = await this.persistence.updateFloor(
      context.organization.id,
      floorId,
      {
        archivedAt:
          lifecycleStatus === "archived" ? new Date().toISOString() : undefined,
        lifecycleStatus,
      },
    );
    if (!floor) {
      throw tenantResourceNotFound("Floor");
    }
    return floor;
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
}
