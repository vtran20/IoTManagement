import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Inject,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type {
  LeakAnalyticsQuery,
  LeakReportExportQuery,
  MonthlyUsageReportQuery,
} from "@iot-management/types";
import type { Response } from "express";
import { ApiError } from "../common/errors/api-error";
import { AuthGuard } from "../common/guards/auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { LeakReportsService } from "./leak-reports.service";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    @Inject(ReportsService)
    private readonly reportsService: ReportsService,
    @Inject(LeakReportsService)
    private readonly leakReportsService: LeakReportsService,
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

  @Get("leak-response")
  leakResponse(
    @Req() request: RequestWithContext,
    @Query() query: LeakAnalyticsQuery,
  ) {
    return this.leakReportsService.json(
      request.context!.organization.id,
      query,
    );
  }

  @Get("leak-response/export")
  async leakResponseExport(
    @Req() request: RequestWithContext,
    @Query() query: LeakReportExportQuery,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (query.format !== "csv" && query.format !== "pdf") {
      throw new ApiError(
        "LEAK_REPORT_FORMAT_INVALID",
        "format must be csv or pdf",
        HttpStatus.BAD_REQUEST,
      );
    }
    const extension = query.format === "pdf" ? "pdf" : "csv";
    response.setHeader(
      "content-disposition",
      `attachment; filename="leak-response.${extension}"`,
    );
    response.setHeader(
      "content-type",
      query.format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8",
    );
    return this.leakReportsService.exportForContext(
      request.context!,
      query,
      query.format,
    );
  }
}
