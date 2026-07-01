import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { AuditService, ListAuditEventsQuery } from "./audit.service";

@Controller("audit/events")
@UseGuards(AuthGuard, RolesGuard)
export class AuditController {
  constructor(
    @Inject(AuditService)
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Roles("owner", "manager")
  list(
    @Req() request: RequestWithContext,
    @Query() query: ListAuditEventsQuery,
  ) {
    return this.auditService.list(request.context!, query);
  }
}
