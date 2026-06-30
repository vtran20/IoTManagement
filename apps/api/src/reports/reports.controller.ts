import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import type { MonthlyUsageReportQuery } from "@iot-management/types";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    @Inject(ReportsService)
    private readonly reportsService: ReportsService,
  ) {}

  @Get("monthly-usage")
  monthlyUsage(
    @Req() request: RequestWithContext,
    @Query() query: MonthlyUsageReportQuery,
  ) {
    return this.reportsService.monthlyUsage(
      request.context!.organization.id,
      query,
    );
  }
}
