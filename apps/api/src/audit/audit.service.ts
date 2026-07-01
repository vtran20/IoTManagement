import { Inject, Injectable } from "@nestjs/common";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

export interface ListAuditEventsQuery {
  action?: string;
  limit?: string;
  targetType?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async list(context: RequestContext, query: ListAuditEventsQuery = {}) {
    const limit = query.limit ? Number(query.limit) : undefined;
    const items = await this.persistence.listAuditLogs({
      action: query.action,
      limit: Number.isFinite(limit) ? limit : undefined,
      organizationId: context.organization.id,
      targetType: query.targetType,
    });

    return { items };
  }
}
