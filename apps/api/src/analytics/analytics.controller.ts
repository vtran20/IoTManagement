import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { AggregatePeriodType } from "@iot-management/types";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { AggregationService } from "./aggregation.service";

interface AggregateRequest {
  periodType?: AggregatePeriodType;
}

@Controller("analytics")
@UseGuards(AuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    @Inject(AggregationService)
    private readonly aggregationService: AggregationService,
  ) {}

  @Post("aggregate")
  @Roles("owner", "manager")
  aggregate(
    @Req() request: RequestWithContext,
    @Body() body: AggregateRequest,
  ) {
    return {
      items: this.aggregationService.aggregate({
        organizationId: request.context!.organization.id,
        periodType: body.periodType ?? "hour",
      }),
    };
  }
}
