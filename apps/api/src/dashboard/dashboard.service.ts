import type {
  AggregatePeriodType,
  DashboardSummaryResponse,
  ListUsageQuery,
} from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import { AlertEventsService } from "../alerts/alert-events.service";
import { UsageQueryService } from "../analytics/usage-query.service";

@Injectable()
export class DashboardService {
  constructor(
    @Inject(UsageQueryService)
    private readonly usageQuery: UsageQueryService,
    @Inject(AlertEventsService)
    private readonly alertEvents: AlertEventsService,
  ) {}

  async summary(organizationId: string): Promise<DashboardSummaryResponse> {
    const trends = (
      await this.usageQuery.getTrends({
        organizationId,
        periodType: "hour",
      })
    ).items;
    const deviceHealth = await this.usageQuery.getDeviceHealth({
      organizationId,
    });
    const openAlerts = (
      await this.alertEvents.list(
        {
          organization: { id: organizationId },
        } as Parameters<AlertEventsService["list"]>[0],
        { status: "open" },
      )
    ).items;

    const utilitySummaries = [
      ...new Set(trends.map((item) => item.utilityType)),
    ]
      .sort()
      .map((utilityType) => {
        const usageValue = roundUsage(
          trends
            .filter((item) => item.utilityType === utilityType)
            .reduce((sum, item) => sum + item.usageValue, 0),
        );
        const costEstimate = roundMoney(
          trends
            .filter((item) => item.utilityType === utilityType)
            .reduce((sum, item) => sum + (item.costEstimate ?? 0), 0),
        );
        return { costEstimate, usageValue, utilityType };
      });

    return {
      criticalAlertCount: openAlerts.filter(
        (alert) => alert.severity === "critical",
      ).length,
      generatedAt: new Date().toISOString(),
      offlineMeterCount: deviceHealth.meters.filter(
        (meter) => meter.status === "offline",
      ).length,
      openAlertCount: openAlerts.length,
      organizationId,
      staleMeterCount: deviceHealth.meters.filter(
        (meter) => meter.status === "stale",
      ).length,
      utilitySummaries,
    };
  }

  trends(organizationId: string, query: DashboardUsageQuery) {
    return this.usageQuery.getTrends({
      ...query,
      organizationId,
      periodType: query.periodType ?? "hour",
    });
  }

  buildingBreakdown(organizationId: string, query: DashboardUsageQuery) {
    return this.usageQuery.getBuildingBreakdown({
      ...query,
      organizationId,
      periodType: query.periodType ?? "hour",
    });
  }

  unitRankings(organizationId: string, query: DashboardUsageQuery) {
    return this.usageQuery.getUnitRankings({
      ...query,
      organizationId,
      periodType: query.periodType ?? "hour",
    });
  }

  deviceHealth(organizationId: string) {
    return this.usageQuery.getDeviceHealth({ organizationId });
  }

  async alerts(organizationId: string) {
    return {
      alerts: (
        await this.alertEvents.list(
          {
            organization: { id: organizationId },
          } as Parameters<AlertEventsService["list"]>[0],
          {},
        )
      ).items,
    };
  }
}

export interface DashboardUsageQuery extends ListUsageQuery {
  periodType?: AggregatePeriodType;
}

function roundUsage(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
