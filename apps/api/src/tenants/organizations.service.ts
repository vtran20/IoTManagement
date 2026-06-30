import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
  ) {}

  getCurrent(context: RequestContext) {
    return {
      organization: context.organization,
      membership: context.membership,
    };
  }

  getById(context: RequestContext, organizationId: string) {
    if (organizationId !== context.organization.id) {
      throw new ApiError(
        "TENANT_ACCESS_DENIED",
        "Organization is outside the authenticated tenant scope",
        HttpStatus.FORBIDDEN,
      );
    }

    const organization = this.persistence.findOrganizationById(organizationId);
    return { organization };
  }
}
