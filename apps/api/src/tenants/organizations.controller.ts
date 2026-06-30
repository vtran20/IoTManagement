import { Controller, Get, Inject, Param, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { RequestWithContext } from "../common/request-context";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get("current")
  current(@Req() request: RequestWithContext) {
    return this.organizationsService.getCurrent(request.context!);
  }

  @Get(":organizationId")
  getById(
    @Req() request: RequestWithContext,
    @Param("organizationId") organizationId: string,
  ) {
    return this.organizationsService.getById(request.context!, organizationId);
  }
}
