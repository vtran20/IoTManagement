import type {
  LeakAnalyticsQuery,
  LeakAnalyticsResponse,
  LeakIncident,
  LeakIncidentResolutionCategory,
  LeakRecurringLocation,
  LeakResponseTimeMetric,
} from "@iot-management/types";
import { leakIncidentResolutionCategories } from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

@Injectable()
export class LeakAnalyticsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async summary(
    organizationId: string,
    query: LeakAnalyticsQuery = {},
  ): Promise<LeakAnalyticsResponse> {
    const { periodStart, periodEnd } = periodFor(query);
    const incidents = (
      await this.persistence.listLeakIncidents({
        buildingId: query.buildingId,
        organizationId,
      })
    ).filter(
      (incident) =>
        incident.detectedAt >= periodStart && incident.detectedAt <= periodEnd,
    );
    const [recurringLocations, resolutionOutcomes] = await Promise.all([
      this.recurringLocations(organizationId, incidents),
      this.resolutionOutcomes(incidents),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      incidentCount: incidents.length,
      periodStart,
      periodEnd,
      responseTime: {
        acknowledged: responseTime(incidents, "acknowledgedAt"),
        contained: responseTime(incidents, "containedAt"),
        resolved: responseTime(incidents, "resolvedAt"),
      },
      excessWater: {
        gallons: round(
          incidents.reduce(
            (total, incident) => total + (incident.estimatedExcessWater ?? 0),
            0,
          ),
        ),
        estimatedCost: roundMoney(
          incidents.reduce(
            (total, incident) => total + (incident.estimatedExcessCost ?? 0),
            0,
          ),
        ),
      },
      recurringLocations,
      resolutionOutcomes,
    };
  }

  private async recurringLocations(
    organizationId: string,
    incidents: LeakIncident[],
  ): Promise<LeakRecurringLocation[]> {
    const grouped = new Map<string, LeakIncident[]>();
    for (const incident of incidents) {
      const key = `${incident.buildingId}:${incident.unitId ?? "shared"}`;
      grouped.set(key, [...(grouped.get(key) ?? []), incident]);
    }

    return Promise.all(
      [...grouped.values()]
        .sort((left, right) => right.length - left.length)
        .map(async (locationIncidents) => {
          const first = locationIncidents[0]!;
          const [building, unit] = await Promise.all([
            this.persistence.findBuildingById(organizationId, first.buildingId),
            first.unitId
              ? this.persistence.findUnitById(organizationId, first.unitId)
              : undefined,
          ]);
          return {
            buildingId: first.buildingId,
            buildingName: building?.name ?? first.buildingId,
            incidentCount: locationIncidents.length,
            resolvedCount: locationIncidents.filter(
              (incident) => incident.status === "resolved",
            ).length,
            unitId: first.unitId,
            unitName: unit?.name,
          };
        }),
    );
  }

  private resolutionOutcomes(
    incidents: LeakIncident[],
  ): Record<LeakIncidentResolutionCategory, number> {
    const outcomes = Object.fromEntries(
      leakIncidentResolutionCategories.map((category) => [category, 0]),
    ) as Record<LeakIncidentResolutionCategory, number>;
    for (const incident of incidents) {
      if (incident.resolutionCategory) {
        outcomes[incident.resolutionCategory] += 1;
      }
    }
    return outcomes;
  }
}

function periodFor(query: LeakAnalyticsQuery): {
  periodEnd: string;
  periodStart: string;
} {
  const periodEnd = query.to ?? new Date().toISOString();
  const periodStart =
    query.from ?? daysBefore(periodEnd, periodDays(query.period));
  return { periodStart, periodEnd };
}

function periodDays(period: LeakAnalyticsQuery["period"]): number {
  return period === "7d" ? 7 : period === "90d" ? 90 : 30;
}

function daysBefore(timestamp: string, days: number): string {
  return new Date(
    new Date(timestamp).getTime() - days * 86_400_000,
  ).toISOString();
}

function responseTime(
  incidents: LeakIncident[],
  target: "acknowledgedAt" | "containedAt" | "resolvedAt",
): LeakResponseTimeMetric {
  const minutes = incidents
    .filter((incident) => incident[target])
    .map(
      (incident) =>
        (new Date(incident[target]!).getTime() -
          new Date(incident.detectedAt).getTime()) /
        60_000,
    )
    .filter((value) => value >= 0)
    .sort((left, right) => left - right);
  if (!minutes.length) return { count: 0 };
  const midpoint = Math.floor(minutes.length / 2);
  const median =
    minutes.length % 2 === 0
      ? (minutes[midpoint - 1]! + minutes[midpoint]!) / 2
      : minutes[midpoint]!;
  return {
    averageMinutes: round(
      minutes.reduce((total, value) => total + value, 0) / minutes.length,
    ),
    count: minutes.length,
    medianMinutes: round(median),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
