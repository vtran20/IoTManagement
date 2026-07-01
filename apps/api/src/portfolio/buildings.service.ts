import type { ListBuildingsQuery } from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { CreateBuildingDto } from "./dto/create-building.dto";
import { UpdateBuildingDto } from "./dto/update-building.dto";
import { tenantResourceNotFound } from "./portfolio-errors";

@Injectable()
export class BuildingsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async create(context: RequestContext, dto: CreateBuildingDto) {
    return this.persistence.createBuilding({
      organizationId: context.organization.id,
      name: dto.name,
      address: dto.address,
      timezone: dto.timezone,
    });
  }

  async list(context: RequestContext, query: ListBuildingsQuery = {}) {
    const items = (
      await this.persistence.listBuildings(context.organization.id)
    ).filter((building) =>
      query.search
        ? building.name.toLowerCase().includes(query.search.toLowerCase())
        : true,
    );

    return { items };
  }

  async get(context: RequestContext, buildingId: string) {
    const building = await this.persistence.findBuildingById(
      context.organization.id,
      buildingId,
    );
    if (!building) {
      throw tenantResourceNotFound("Building");
    }
    const [floors, units, meters] = await Promise.all([
      this.persistence.listFloors(context.organization.id, buildingId),
      this.persistence.listUnits({
        organizationId: context.organization.id,
        buildingId,
      }),
      this.persistence.listMeters({
        organizationId: context.organization.id,
        buildingId,
      }),
    ]);
    return { ...building, building, floors, meters, units };
  }

  async update(
    context: RequestContext,
    buildingId: string,
    dto: UpdateBuildingDto,
  ) {
    const building = await this.persistence.updateBuilding(
      context.organization.id,
      buildingId,
      dto,
    );
    if (!building) {
      throw tenantResourceNotFound("Building");
    }
    return building;
  }

  async archive(context: RequestContext, buildingId: string) {
    return this.setLifecycle(context, buildingId, "archived");
  }

  async restore(context: RequestContext, buildingId: string) {
    return this.setLifecycle(context, buildingId, "active");
  }

  private async setLifecycle(
    context: RequestContext,
    buildingId: string,
    lifecycleStatus: "active" | "archived",
  ) {
    const building = await this.persistence.updateBuilding(
      context.organization.id,
      buildingId,
      {
        archivedAt:
          lifecycleStatus === "archived" ? new Date().toISOString() : undefined,
        lifecycleStatus,
      },
    );
    if (!building) {
      throw tenantResourceNotFound("Building");
    }
    return building;
  }
}
