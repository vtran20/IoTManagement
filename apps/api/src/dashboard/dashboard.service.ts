import type {
  AggregatePeriodType,
  DashboardOverviewQuery as DashboardOverviewQueryInput,
  DashboardOverviewResponse,
  DashboardSummaryResponse,
  ListUsageQuery,
  UsageTrendPoint,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { AlertEventsService } from "../alerts/alert-events.service";
import { UsageQueryService } from "../analytics/usage-query.service";
import { ApiError } from "../common/errors/api-error";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

@Injectable()
export class DashboardService {
  constructor(
    @Inject(UsageQueryService)
    private readonly usageQuery: UsageQueryService,
    @Inject(AlertEventsService)
    private readonly alertEvents: AlertEventsService,
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
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

    return buildSummary({ deviceHealth, openAlerts, organizationId, trends });
  }

  async overview(
    organizationId: string,
    query: DashboardOverviewQuery,
  ): Promise<DashboardOverviewResponse> {
    const range = resolveOverviewRange(query);
    if (
      query.buildingId &&
      !(await this.persistence.findBuildingById(
        organizationId,
        query.buildingId,
      ))
    ) {
      throw new ApiError(
        "TENANT_RESOURCE_NOT_FOUND",
        "Building was not found in the authenticated tenant scope",
        HttpStatus.NOT_FOUND,
      );
    }

    const usageQuery = {
      buildingId: query.buildingId,
      from: range.from,
      organizationId,
      periodType: range.periodType,
      to: range.to,
      utilityType: query.utilityType,
    } as const;
    const [trends, buildings, unitRankings, deviceHealth, alertResponse] =
      await Promise.all([
        this.usageQuery.getTrends(usageQuery),
        this.usageQuery.getBuildingBreakdown(usageQuery),
        this.usageQuery.getUnitRankings({ ...usageQuery, limit: 10 }),
        this.usageQuery.getDeviceHealth({ organizationId }),
        this.alertEvents.list(
          {
            organization: { id: organizationId },
          } as Parameters<AlertEventsService["list"]>[0],
          { status: "open" },
        ),
      ]);

    return {
      buildings,
      deviceHealth,
      range,
      summary: buildSummary({
        deviceHealth,
        openAlerts: alertResponse.items,
        organizationId,
        trends: trends.items,
      }),
      trends,
      units: unitRankings,
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

export interface DashboardOverviewQuery extends DashboardOverviewQueryInput {}

function buildSummary(input: {
  deviceHealth: Awaited<ReturnType<UsageQueryService["getDeviceHealth"]>>;
  openAlerts: Array<{ severity: string }>;
  organizationId: string;
  trends: UsageTrendPoint[];
}): DashboardSummaryResponse {
  const utilitySummaries = [
    ...new Set(input.trends.map((item) => item.utilityType)),
  ]
    .sort()
    .map((utilityType) => {
      const items = input.trends.filter(
        (item) => item.utilityType === utilityType,
      );
      return {
        costEstimate: roundMoney(
          items.reduce((sum, item) => sum + (item.costEstimate ?? 0), 0),
        ),
        usageValue: roundUsage(
          items.reduce((sum, item) => sum + item.usageValue, 0),
        ),
        utilityType,
      };
    });

  return {
    criticalAlertCount: input.openAlerts.filter(
      (alert) => alert.severity === "critical",
    ).length,
    generatedAt: new Date().toISOString(),
    offlineMeterCount: input.deviceHealth.meters.filter(
      (meter) => meter.status === "offline",
    ).length,
    openAlertCount: input.openAlerts.length,
    organizationId: input.organizationId,
    staleMeterCount: input.deviceHealth.meters.filter(
      (meter) => meter.status === "stale",
    ).length,
    utilitySummaries,
  };
}

function resolveOverviewRange(query: DashboardOverviewQueryInput) {
  const now = new Date();
  const defaultTo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);
  const from = parseDate(query.from, defaultFrom, "from");
  const to = parseDate(query.to, defaultTo, "to");
  if (from >= to) {
    throw new ApiError(
      "INVALID_DASHBOARD_RANGE",
      "from must be earlier than to",
      HttpStatus.BAD_REQUEST,
    );
  }
  return {
    from: from.toISOString(),
    periodType: "day" as const,
    to: to.toISOString(),
  };
}

function parseDate(
  value: string | undefined,
  fallback: Date,
  field: string,
): Date {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(
      "INVALID_DASHBOARD_RANGE",
      `${field} must be an ISO timestamp`,
      HttpStatus.BAD_REQUEST,
    );
  }
  return parsed;
}

function roundUsage(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
