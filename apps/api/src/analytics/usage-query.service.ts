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
    return {
      items: (
        await this.persistence.listUsageAggregates({
          ...input,
          periodType: input.periodType ?? "hour",
        })
      ).map((aggregate) => ({
        costEstimate:
          aggregate.costEstimate ??
          this.costEstimate.estimate(
            aggregate.utilityType,
            aggregate.usageValue,
          ),
        periodEnd: aggregate.periodEnd,
        periodStart: aggregate.periodStart,
        usageValue: aggregate.usageValue,
        utilityType: aggregate.utilityType,
      })),
    };
  }

  async getBuildingBreakdown(
    input: UsageQueryInput,
  ): Promise<PageResponse<BuildingBreakdownItem>> {
    const grouped = new Map<string, BuildingBreakdownItem>();
    for (const aggregate of await this.persistence.listUsageAggregates({
      ...input,
      periodType: input.periodType ?? "hour",
    })) {
      const building = await this.persistence.findBuildingById(
        input.organizationId,
        aggregate.buildingId,
      );
      const key = `${aggregate.buildingId}:${aggregate.utilityType}`;
      const existing = grouped.get(key);
      const usageValue = roundUsage(
        (existing?.usageValue ?? 0) + aggregate.usageValue,
      );
      grouped.set(key, {
        buildingId: aggregate.buildingId,
        buildingName: building?.name ?? aggregate.buildingId,
        costEstimate: this.costEstimate.estimate(
          aggregate.utilityType,
          usageValue,
        ),
        usageValue,
        utilityType: aggregate.utilityType,
      });
    }
    return { items: [...grouped.values()] };
  }

  async getUnitRankings(
    input: UsageQueryInput,
  ): Promise<PageResponse<UnitRankingItem>> {
    const grouped = new Map<string, UnitRankingItem>();
    for (const aggregate of await this.persistence.listUsageAggregates({
      ...input,
      periodType: input.periodType ?? "hour",
    })) {
      if (!aggregate.unitId) {
        continue;
      }
      const unit = await this.persistence.findUnitById(
        input.organizationId,
        aggregate.unitId,
      );
      const building = await this.persistence.findBuildingById(
        input.organizationId,
        aggregate.buildingId,
      );
      const key = `${aggregate.unitId}:${aggregate.utilityType}`;
      const existing = grouped.get(key);
      grouped.set(key, {
        buildingId: aggregate.buildingId,
        buildingName: building?.name ?? aggregate.buildingId,
        unitId: aggregate.unitId,
        unitName: unit?.name ?? aggregate.unitId,
        usageValue: roundUsage(
          (existing?.usageValue ?? 0) + aggregate.usageValue,
        ),
        utilityType: aggregate.utilityType,
      });
    }
    return {
      items: [...grouped.values()].sort(
        (left, right) => right.usageValue - left.usageValue,
      ),
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
