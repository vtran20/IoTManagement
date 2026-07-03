import type {
  LeakDetectionPolicy,
  Meter,
  MeterReading,
} from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

@Injectable()
export class LeakDetectionService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async evaluateAcceptedReading(input: {
    meter: Meter;
    organizationId: string;
    reading: MeterReading;
  }): Promise<void> {
    if (
      input.meter.utilityType !== "water" ||
      input.reading.utilityType !== "water" ||
      input.reading.readingKind !== "interval" ||
      input.reading.quality !== "good"
    ) {
      return;
    }

    const policies = (
      await this.persistence.listLeakDetectionPolicies({
        organizationId: input.organizationId,
      })
    ).filter(
      (policy) => policy.enabled && policyMatchesMeter(policy, input.meter),
    );
    if (!policies.length) return;

    const readings = (
      await this.persistence.listReadings({
        meterId: input.meter.id,
        organizationId: input.organizationId,
        to: input.reading.measuredAt,
      })
    ).filter(
      (reading) =>
        reading.utilityType === "water" &&
        reading.readingKind === "interval" &&
        reading.quality === "good",
    );

    for (const policy of policies) {
      const window = continuousWindow(readings, policy);
      if (!window) continue;

      const now = new Date().toISOString();
      let incident = await this.persistence.findOpenLeakIncidentForPolicyMeter({
        meterId: input.meter.id,
        organizationId: input.organizationId,
        policyId: policy.id,
      });
      if (!incident) {
        const excessWater = gallons(
          window.reduce(
            (total, reading) =>
              total + Math.max(0, reading.value - policy.minimumIntervalUsage),
            0,
          ),
          window[0]!.unit,
        );
        const rates = await this.persistence.getUtilityRates(
          input.organizationId,
        );
        incident = await this.persistence.createLeakIncident({
          buildingId: input.meter.buildingId,
          description: `${window.length} consecutive water intervals exceeded the continuous-flow threshold.`,
          detectedAt: input.reading.measuredAt,
          estimatedExcessCost: round(excessWater * rates.waterPerGallon),
          estimatedExcessWater: round(excessWater),
          meterId: input.meter.id,
          organizationId: input.organizationId,
          severity: policy.severity,
          source: "meter_anomaly",
          title: "Continuous water flow detected",
          unitId: input.meter.unitId,
        });
        await this.persistence.createIncidentActivity({
          createdAt: now,
          incidentId: incident.id,
          organizationId: input.organizationId,
          summary: "Continuous water-flow anomaly detected",
          type: "opened",
        });
        await this.persistence.createAuditLog({
          action: "leak_incident.detected",
          metadata: { meterId: input.meter.id, policyId: policy.id },
          organizationId: input.organizationId,
          targetId: incident.id,
          targetType: "leak_incident",
        });
      }

      await this.persistence.createIncidentEvidence({
        createdAt: now,
        incidentId: incident.id,
        meterId: input.meter.id,
        observedUsage: window.reduce(
          (total, reading) => total + reading.value,
          0,
        ),
        organizationId: input.organizationId,
        policyId: policy.id,
        readingIds: window.map((reading) => reading.id),
        thresholdUsage: policy.minimumIntervalUsage * window.length,
        windowEndedAt: window[window.length - 1]!.measuredAt,
        windowStartedAt: window[0]!.measuredAt,
      });
    }
  }
}

function policyMatchesMeter(
  policy: LeakDetectionPolicy,
  meter: Meter,
): boolean {
  return (
    policy.scopeType === "organization" ||
    (policy.scopeType === "building" && policy.scopeId === meter.buildingId) ||
    (policy.scopeType === "unit" && policy.scopeId === meter.unitId) ||
    (policy.scopeType === "meter" && policy.scopeId === meter.id)
  );
}

function continuousWindow(
  readings: MeterReading[],
  policy: LeakDetectionPolicy,
): MeterReading[] | undefined {
  let streak: MeterReading[] = [];
  for (const reading of readings) {
    const previous = streak[streak.length - 1];
    const gapMinutes = previous
      ? (new Date(reading.measuredAt).getTime() -
          new Date(previous.measuredAt).getTime()) /
        60_000
      : 0;
    if (
      reading.value < policy.minimumIntervalUsage ||
      (previous && gapMinutes > policy.maximumIntervalGapMinutes)
    ) {
      streak = reading.value >= policy.minimumIntervalUsage ? [reading] : [];
    } else {
      streak.push(reading);
    }
  }
  return streak.length >= policy.minimumConsecutiveIntervals
    ? streak
    : undefined;
}

function gallons(value: number, unit: MeterReading["unit"]): number {
  return unit === "liter" ? value / 3.78541 : value;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
