import type {
  AggregatePeriodType,
  MeterReading,
  UsageAggregate,
} from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { CostEstimateService } from "./cost-estimate.service";

export interface AggregateUsageInput {
  organizationId: string;
  periodType: AggregatePeriodType;
}

export interface IntervalUsage {
  meterId: string;
  organizationId: string;
  periodEnd: string;
  periodStart: string;
  usageValue: number;
  utilityType: MeterReading["utilityType"];
}

@Injectable()
export class AggregationService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(CostEstimateService)
    private readonly costEstimate: CostEstimateService,
  ) {}

  calculateIntervalUsage(readings: MeterReading[]): IntervalUsage[] {
    const validReadings = readings
      .filter(
        (reading) =>
          reading.quality !== "invalid" && reading.quality !== "duplicate",
      )
      .sort((left, right) => left.measuredAt.localeCompare(right.measuredAt));

    if (validReadings.length === 0) {
      return [];
    }

    if (validReadings[0]!.readingKind === "interval") {
      return validReadings.map((reading) => ({
        meterId: reading.meterId,
        organizationId: reading.organizationId,
        periodEnd: nextHour(reading.measuredAt),
        periodStart: reading.measuredAt,
        usageValue: reading.value,
        utilityType: reading.utilityType,
      }));
    }

    const intervals: IntervalUsage[] = [];
    for (let index = 1; index < validReadings.length; index += 1) {
      const previous = validReadings[index - 1]!;
      const current = validReadings[index]!;
      const usageValue = current.value - previous.value;
      if (usageValue < 0) {
        continue;
      }
      intervals.push({
        meterId: current.meterId,
        organizationId: current.organizationId,
        periodEnd: current.measuredAt,
        periodStart: current.measuredAt,
        usageValue: roundUsage(usageValue),
        utilityType: current.utilityType,
      });
    }
    return intervals;
  }

  async aggregate(input: AggregateUsageInput): Promise<UsageAggregate[]> {
    const meters = await this.persistence.listMeters({
      organizationId: input.organizationId,
    });
    const rates = await this.persistence.getUtilityRates(input.organizationId);
    const grouped = new Map<string, Omit<UsageAggregate, "id">>();

    for (const meter of meters) {
      const intervals = this.calculateIntervalUsage(
        await this.persistence.listReadings({
          meterId: meter.id,
          organizationId: input.organizationId,
        }),
      );

      for (const interval of intervals) {
        const periodStart = truncatePeriod(
          interval.periodStart,
          input.periodType,
        );
        const periodEnd = periodEndFor(periodStart, input.periodType);
        const key = [
          meter.id,
          meter.buildingId,
          meter.unitId ?? "",
          interval.utilityType,
          periodStart,
        ].join("|");
        const existing = grouped.get(key);
        const usageValue = roundUsage(
          (existing?.usageValue ?? 0) + interval.usageValue,
        );

        grouped.set(key, {
          buildingId: meter.buildingId,
          costEstimate: this.costEstimate.estimate(
            interval.utilityType,
            usageValue,
            rates,
          ),
          meterId: meter.id,
          organizationId: input.organizationId,
          periodEnd,
          periodStart,
          periodType: input.periodType,
          unitId: meter.unitId,
          usageValue,
          utilityType: interval.utilityType,
        });
      }
    }

    return await this.persistence.replaceUsageAggregates({
      aggregates: [...grouped.values()],
      organizationId: input.organizationId,
      periodType: input.periodType,
    });
  }
}

function truncatePeriod(
  measuredAt: string,
  periodType: AggregatePeriodType,
): string {
  const date = new Date(measuredAt);
  date.setUTCMinutes(0, 0, 0);
  if (periodType === "day" || periodType === "month") {
    date.setUTCHours(0, 0, 0, 0);
  }
  if (periodType === "month") {
    date.setUTCDate(1);
  }
  return date.toISOString();
}

function periodEndFor(
  periodStart: string,
  periodType: AggregatePeriodType,
): string {
  const date = new Date(periodStart);
  if (periodType === "hour") {
    date.setUTCHours(date.getUTCHours() + 1);
  } else if (periodType === "day") {
    date.setUTCDate(date.getUTCDate() + 1);
  } else {
    date.setUTCMonth(date.getUTCMonth() + 1);
  }
  return date.toISOString();
}

function nextHour(measuredAt: string): string {
  const date = new Date(measuredAt);
  date.setUTCHours(date.getUTCHours() + 1);
  return date.toISOString();
}

function roundUsage(value: number): number {
  return Math.round(value * 1000) / 1000;
}
