import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  getCurrent(context: RequestContext) {
    return {
      organization: context.organization,
      membership: context.membership,
    };
  }

  async getById(context: RequestContext, organizationId: string) {
    if (organizationId !== context.organization.id) {
      throw new ApiError(
        "TENANT_ACCESS_DENIED",
        "Organization is outside the authenticated tenant scope",
        HttpStatus.FORBIDDEN,
      );
    }

    const organization =
      await this.persistence.findOrganizationById(organizationId);
    return { organization };
  }
}
