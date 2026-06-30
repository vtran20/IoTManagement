import type { ListBuildingsQuery } from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { CreateBuildingDto } from "./dto/create-building.dto";
import { UpdateBuildingDto } from "./dto/update-building.dto";
import { tenantResourceNotFound } from "./portfolio-errors";

@Injectable()
export class BuildingsService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
  ) {}

  create(context: RequestContext, dto: CreateBuildingDto) {
    return this.persistence.createBuilding({
      organizationId: context.organization.id,
      name: dto.name,
      address: dto.address,
      timezone: dto.timezone,
    });
  }

  list(context: RequestContext, query: ListBuildingsQuery = {}) {
    const items = this.persistence
      .listBuildings(context.organization.id)
      .filter((building) =>
        query.search
          ? building.name.toLowerCase().includes(query.search.toLowerCase())
          : true,
      );

    return { items };
  }

  get(context: RequestContext, buildingId: string) {
    const building = this.persistence.findBuildingById(
      context.organization.id,
      buildingId,
    );
    if (!building) {
      throw tenantResourceNotFound("Building");
    }
    return building;
  }

  update(context: RequestContext, buildingId: string, dto: UpdateBuildingDto) {
    const building = this.persistence.updateBuilding(
      context.organization.id,
      buildingId,
      dto,
    );
    if (!building) {
      throw tenantResourceNotFound("Building");
    }
    return building;
  }
}
