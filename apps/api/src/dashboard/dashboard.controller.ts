import {
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { DashboardTimingInterceptor } from "../common/interceptors/dashboard-timing.interceptor";
import { RequestWithContext } from "../common/request-context";
import {
  DashboardOverviewQuery,
  DashboardService,
  DashboardUsageQuery,
} from "./dashboard.service";

@Controller("dashboard")
@UseGuards(AuthGuard)
@UseInterceptors(DashboardTimingInterceptor)
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  @Get("summary")
  summary(@Req() request: RequestWithContext) {
    return this.dashboardService.summary(request.context!.organization.id);
  }

  @Get("overview")
  overview(
    @Req() request: RequestWithContext,
    @Query() query: DashboardOverviewQuery,
  ) {
    return this.dashboardService.overview(
      request.context!.organization.id,
      query,
    );
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

  @Get("alerts")
  alerts(@Req() request: RequestWithContext) {
    return this.dashboardService.alerts(request.context!.organization.id);
  }
}
