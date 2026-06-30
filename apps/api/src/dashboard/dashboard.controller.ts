import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { RequestWithContext } from "../common/request-context";
import { DashboardService, DashboardUsageQuery } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  @Get("summary")
  summary(@Req() request: RequestWithContext) {
    return this.dashboardService.summary(request.context!.organization.id);
  }

  @Get("trends")
  trends(
    @Req() request: RequestWithContext,
    @Query() query: DashboardUsageQuery,
  ) {
    return this.dashboardService.trends(
      request.context!.organization.id,
      query,
    );
  }

  @Get("buildings")
  buildingBreakdown(
    @Req() request: RequestWithContext,
    @Query() query: DashboardUsageQuery,
  ) {
    return this.dashboardService.buildingBreakdown(
      request.context!.organization.id,
      query,
    );
  }

  @Get("units")
  unitRankings(
    @Req() request: RequestWithContext,
    @Query() query: DashboardUsageQuery,
  ) {
    return this.dashboardService.unitRankings(
      request.context!.organization.id,
      query,
    );
  }

  @Get("device-health")
  deviceHealth(@Req() request: RequestWithContext) {
    return this.dashboardService.deviceHealth(request.context!.organization.id);
  }
}
