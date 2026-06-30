import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { CreateFloorDto } from "./dto/create-floor.dto";
import { UpdateFloorDto } from "./dto/update-floor.dto";
import { tenantResourceNotFound } from "./portfolio-errors";

@Injectable()
export class FloorsService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
  ) {}

  create(context: RequestContext, dto: CreateFloorDto) {
    this.requireBuilding(context, dto.buildingId);
    return this.persistence.createFloor({
      organizationId: context.organization.id,
      buildingId: dto.buildingId,
      name: dto.name,
      level: dto.level,
    });
  }

  list(context: RequestContext, query: { buildingId?: string }) {
    if (query.buildingId) {
      this.requireBuilding(context, query.buildingId);
    }
    return {
      items: this.persistence.listFloors(
        context.organization.id,
        query.buildingId,
      ),
    };
  }

  get(context: RequestContext, floorId: string) {
    const floor = this.persistence.findFloorById(
      context.organization.id,
      floorId,
    );
    if (!floor) {
      throw tenantResourceNotFound("Floor");
    }
    return floor;
  }

  update(context: RequestContext, floorId: string, dto: UpdateFloorDto) {
    const floor = this.persistence.updateFloor(
      context.organization.id,
      floorId,
      dto,
    );
    if (!floor) {
      throw tenantResourceNotFound("Floor");
    }
    return floor;
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
}
