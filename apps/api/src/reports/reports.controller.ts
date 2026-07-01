import {
  Controller,
  Get,
  Header,
  Inject,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { MonthlyUsageReportQuery } from "@iot-management/types";
import type { Response } from "express";
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

  @Get("monthly-usage/export")
  @Header("content-type", "text/csv; charset=utf-8")
  async monthlyUsageExport(
    @Req() request: RequestWithContext,
    @Query() query: MonthlyUsageReportQuery,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader(
      "content-disposition",
      `attachment; filename="monthly-usage-${query.month}.csv"`,
    );
    return await this.reportsService.monthlyUsageCsvForContext(
      request.context!,
      query,
    );
  }
}
