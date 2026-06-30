import { Inject, Injectable } from "@nestjs/common";
import type { UserRole } from "@iot-management/types";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

export interface CreateMembershipDto {
  email?: string;
  role?: UserRole;
}

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async create(context: RequestContext, dto: CreateMembershipDto) {
    const membership =
      await this.persistence.createMembershipForCurrentOrganization({
        email: dto.email ?? "",
        organizationId: context.organization.id,
        role: dto.role ?? "viewer",
      });

    return { membership };
  }
}
