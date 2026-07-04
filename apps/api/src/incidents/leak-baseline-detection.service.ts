import type {
  LeakBaselineSettings,
  Meter,
  MeterReading,
  UpdateLeakBaselineSettingsRequest,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import { IncidentNotificationsService } from "../notifications/incident-notifications.service";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

@Injectable()
export class LeakBaselineDetectionService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(IncidentNotificationsService)
    private readonly notifications: IncidentNotificationsService,
  ) {}

  getSettings(context: RequestContext): Promise<LeakBaselineSettings> {
    return Promise.resolve(
      this.persistence.getLeakBaselineSettings(context.organization.id),
    );
  }

  async updateSettings(
    context: RequestContext,
    dto: UpdateLeakBaselineSettingsRequest,
  ): Promise<LeakBaselineSettings> {
    const current = await this.persistence.getLeakBaselineSettings(
      context.organization.id,
    );
    const enabled = dto.enabled ?? current.enabled;
    const thresholdMultiplier =
      dto.thresholdMultiplier ?? current.thresholdMultiplier;
    if (typeof enabled !== "boolean") {
      throw new ApiError(
        "LEAK_BASELINE_ENABLED_INVALID",
        "enabled must be a boolean",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      !Number.isFinite(thresholdMultiplier) ||
      thresholdMultiplier < 1.1 ||
      thresholdMultiplier > 10
    ) {
      throw new ApiError(
        "LEAK_BASELINE_MULTIPLIER_INVALID",
        "thresholdMultiplier must be between 1.1 and 10",
        HttpStatus.BAD_REQUEST,
      );
    }
    const settings = await this.persistence.upsertLeakBaselineSettings({
      enabled,
      minimumValidDays: 14,
      organizationId: context.organization.id,
      thresholdMultiplier,
      updatedAt: new Date().toISOString(),
    });
    await this.persistence.createAuditLog({
      action: "leak_baseline_settings.updated",
      actorUserId: context.user.id,
      metadata: { enabled, thresholdMultiplier },
      organizationId: context.organization.id,
      targetId: context.organization.id,
      targetType: "leak_baseline_settings",
    });
    return settings;
  }

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
    const settings = await this.persistence.getLeakBaselineSettings(
      input.organizationId,
    );
    if (!settings.enabled) return;

    const historical = (
      await this.persistence.listReadings({
        meterId: input.meter.id,
        organizationId: input.organizationId,
        to: input.reading.measuredAt,
      })
    ).filter(
      (reading) =>
        reading.id !== input.reading.id &&
        reading.measuredAt < input.reading.measuredAt &&
        reading.utilityType === "water" &&
        reading.readingKind === "interval" &&
        reading.quality === "good" &&
        utcHour(reading.measuredAt) === utcHour(input.reading.measuredAt),
    );
    const validDays = new Set(
      historical.map((reading) => reading.measuredAt.slice(0, 10)),
    );
    if (validDays.size < settings.minimumValidDays || !historical.length) {
      return;
    }
    const baseline =
      historical.reduce((total, reading) => total + gallons(reading), 0) /
      historical.length;
    const threshold = baseline * settings.thresholdMultiplier;
    const observed = gallons(input.reading);
    if (observed <= threshold) return;

    const now = new Date().toISOString();
    let incident = (
      await this.persistence.listLeakIncidents({
        organizationId: input.organizationId,
      })
    ).find(
      (candidate) =>
        candidate.meterId === input.meter.id &&
        candidate.source === "meter_anomaly" &&
        candidate.status !== "resolved",
    );
    if (!incident) {
      const rates = await this.persistence.getUtilityRates(
        input.organizationId,
      );
      incident = await this.persistence.createLeakIncident({
        buildingId: input.meter.buildingId,
        description:
          "Water interval usage exceeded the opt-in hourly baseline.",
        detectedAt: input.reading.measuredAt,
        estimatedExcessCost: roundMoney(
          (observed - threshold) * rates.waterPerGallon,
        ),
        estimatedExcessWater: round(observed - threshold),
        meterId: input.meter.id,
        organizationId: input.organizationId,
        severity: "warning",
        source: "meter_anomaly",
        title: "Water usage exceeded baseline",
        unitId: input.meter.unitId,
      });
      await this.notifications.notifyIncidentOpened(incident);
    }
    await this.persistence.createIncidentEvidence({
      createdAt: now,
      incidentId: incident.id,
      meterId: input.meter.id,
      observedUsage: round(observed),
      organizationId: input.organizationId,
      readingIds: [input.reading.id],
      thresholdUsage: round(threshold),
      windowEndedAt: input.reading.measuredAt,
      windowStartedAt: input.reading.measuredAt,
    });
    await this.persistence.createIncidentActivity({
      createdAt: now,
      incidentId: incident.id,
      organizationId: input.organizationId,
      summary: `Baseline threshold exceeded: ${round(observed)} gallons versus ${round(threshold)} gallons.`,
      type:
        incident.detectedAt === input.reading.measuredAt ? "opened" : "note",
    });
    await this.persistence.createAuditLog({
      action: "leak_baseline.threshold_exceeded",
      metadata: {
        baseline: round(baseline),
        meterId: input.meter.id,
        observed: round(observed),
        threshold: round(threshold),
      },
      organizationId: input.organizationId,
      targetId: incident.id,
      targetType: "leak_incident",
    });
  }
}

function gallons(reading: MeterReading): number {
  return reading.unit === "liter" ? reading.value / 3.78541 : reading.value;
}

function utcHour(timestamp: string): number {
  return new Date(timestamp).getUTCHours();
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
