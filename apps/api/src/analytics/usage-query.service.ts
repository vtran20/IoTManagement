import type {
  AggregatePeriodType,
  BuildingBreakdownItem,
  DeviceHealthResponse,
  ListUsageQuery,
  PageResponse,
  UnitRankingItem,
  UsageTrendPoint,
} from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { CostEstimateService } from "./cost-estimate.service";

export interface UsageQueryInput extends ListUsageQuery {
  limit?: number;
  organizationId: string;
  periodType?: AggregatePeriodType;
}

@Injectable()
export class UsageQueryService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(CostEstimateService)
    private readonly costEstimate: CostEstimateService,
  ) {}

  async getTrends(
    input: UsageQueryInput,
  ): Promise<PageResponse<UsageTrendPoint>> {
    const items = await this.persistence.listDashboardTrendAggregates({
      ...input,
      periodType: input.periodType ?? "hour",
    });

    return {
      items: items.map((item) => ({
        costEstimate: roundMoney(
          item.costEstimate +
            this.costEstimate.estimate(
              item.utilityType,
              item.usageWithoutCostEstimate,
            ),
        ),
        periodEnd: item.periodEnd,
        periodStart: item.periodStart,
        usageValue: roundUsage(item.usageValue),
        utilityType: item.utilityType,
      })),
    };
  }

  async getBuildingBreakdown(
    input: UsageQueryInput,
  ): Promise<PageResponse<BuildingBreakdownItem>> {
    const items = await this.persistence.listDashboardBuildingAggregates({
      ...input,
      periodType: input.periodType ?? "hour",
    });
    return {
      items: items.map((item) => ({
        buildingId: item.buildingId,
        buildingName: item.buildingName,
        costEstimate: roundMoney(
          item.costEstimate +
            this.costEstimate.estimate(
              item.utilityType,
              item.usageWithoutCostEstimate,
            ),
        ),
        usageValue: roundUsage(item.usageValue),
        utilityType: item.utilityType,
      })),
    };
  }

  async getUnitRankings(
    input: UsageQueryInput,
  ): Promise<PageResponse<UnitRankingItem>> {
    const items = await this.persistence.listDashboardUnitAggregates({
      ...input,
      periodType: input.periodType ?? "hour",
    });
    return {
      items: items.map((item) => ({
        ...item,
        usageValue: roundUsage(item.usageValue),
      })),
    };
  }

  async getDeviceHealth(input: {
    now?: string;
    organizationId: string;
  }): Promise<DeviceHealthResponse> {
    const nowMs = new Date(input.now ?? new Date().toISOString()).getTime();
    return {
      meters: (
        await this.persistence.listMeters({
          organizationId: input.organizationId,
        })
      ).map((meter) => {
        const lastReadingMs = meter.lastReadingAt
          ? new Date(meter.lastReadingAt).getTime()
          : undefined;
        const computedStatus =
          meter.status === "online" &&
          (!lastReadingMs || nowMs - lastReadingMs > 2 * 60 * 60 * 1000)
            ? "stale"
            : meter.status;
        return {
          externalId: meter.externalId,
          lastReadingAt: meter.lastReadingAt,
          meterId: meter.id,
          status: computedStatus,
          utilityType: meter.utilityType,
        };
      }),
    };
  }
}

function roundUsage(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
