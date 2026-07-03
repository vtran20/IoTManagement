import type {
  CreateMoistureSensorRequest,
  IngestMoistureSensorEventRequest,
  IncidentCorrelationSettings,
  MoistureSensor,
  MoistureSensorIngestResponse,
  UpdateIncidentCorrelationSettingsRequest,
  UpdateMoistureSensorRequest,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import { IncidentNotificationsService } from "../notifications/incident-notifications.service";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";

@Injectable()
export class MoistureSensorsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(IncidentNotificationsService)
    private readonly notifications: IncidentNotificationsService,
  ) {}

  async create(context: RequestContext, dto: CreateMoistureSensorRequest) {
    const building = await this.persistence.findBuildingById(
      context.organization.id,
      dto.buildingId,
    );
    if (!building) throw tenantResourceNotFound("Building");
    if (dto.unitId) {
      const unit = await this.persistence.findUnitById(
        context.organization.id,
        dto.unitId,
      );
      if (!unit || unit.buildingId !== building.id) {
        throw tenantResourceNotFound("Unit");
      }
    }
    const externalId = dto.externalId?.trim();
    const name = dto.name?.trim();
    if (!externalId || !name) {
      throw new ApiError(
        "MOISTURE_SENSOR_FIELDS_REQUIRED",
        "externalId and name are required",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      await this.persistence.findMoistureSensorByExternalId(
        context.organization.id,
        externalId,
      )
    ) {
      throw new ApiError(
        "MOISTURE_SENSOR_EXTERNAL_ID_EXISTS",
        "Sensor externalId already exists in this organization",
        HttpStatus.CONFLICT,
      );
    }
    const now = new Date().toISOString();
    const sensor = await this.persistence.createMoistureSensor({
      buildingId: building.id,
      externalId,
      name,
      organizationId: context.organization.id,
      source: "simulated",
      status: "online",
      unitId: dto.unitId,
      createdAt: now,
      updatedAt: now,
    });
    await this.audit(context, "moisture_sensor.created", sensor.id, {
      externalId: sensor.externalId,
    });
    return sensor;
  }

  async list(context: RequestContext, buildingId?: string) {
    return {
      items: await this.persistence.listMoistureSensors({
        buildingId,
        organizationId: context.organization.id,
      }),
    };
  }

  async get(context: RequestContext, sensorId: string) {
    return this.requireSensor(context, sensorId);
  }

  async update(
    context: RequestContext,
    sensorId: string,
    dto: UpdateMoistureSensorRequest,
  ) {
    await this.requireSensor(context, sensorId);
    if (dto.status && !["online", "offline", "disabled"].includes(dto.status)) {
      throw new ApiError(
        "MOISTURE_SENSOR_STATUS_INVALID",
        "Sensor status is invalid",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new ApiError(
        "MOISTURE_SENSOR_NAME_REQUIRED",
        "Sensor name cannot be empty",
        HttpStatus.BAD_REQUEST,
      );
    }
    const sensor = await this.persistence.updateMoistureSensor(
      context.organization.id,
      sensorId,
      {
        name: dto.name?.trim(),
        status: dto.status,
        updatedAt: new Date().toISOString(),
      },
    );
    if (!sensor) throw tenantResourceNotFound("Moisture sensor");
    await this.audit(context, "moisture_sensor.updated", sensor.id, {
      fields: Object.keys(dto),
    });
    return sensor;
  }

  async listEvents(context: RequestContext, sensorId: string) {
    await this.requireSensor(context, sensorId);
    return {
      items: await this.persistence.listMoistureSensorEvents({
        organizationId: context.organization.id,
        sensorId,
      }),
    };
  }

  async ingest(
    context: RequestContext,
    sensorId: string,
    dto: IngestMoistureSensorEventRequest,
  ): Promise<MoistureSensorIngestResponse> {
    const sensor = await this.requireSensor(context, sensorId);
    if (sensor.status === "disabled") {
      throw new ApiError(
        "MOISTURE_SENSOR_DISABLED",
        "Disabled sensors cannot accept events",
        HttpStatus.CONFLICT,
      );
    }
    if (dto.state !== "dry" && dto.state !== "wet") {
      throw new ApiError(
        "MOISTURE_SENSOR_EVENT_STATE_INVALID",
        "Sensor event state must be dry or wet",
        HttpStatus.BAD_REQUEST,
      );
    }
    const measuredAt = new Date(dto.measuredAt);
    if (Number.isNaN(measuredAt.getTime())) {
      throw new ApiError(
        "MOISTURE_SENSOR_EVENT_TIME_INVALID",
        "measuredAt must be an ISO timestamp",
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.persistence.createMoistureSensorEvent({
      measuredAt: measuredAt.toISOString(),
      organizationId: context.organization.id,
      receivedAt: new Date().toISOString(),
      sensorId: sensor.id,
      state: dto.state,
    });
    if (!result.created) {
      const evidence = await this.persistence.findIncidentSensorEvidenceByEvent(
        context.organization.id,
        result.event.id,
      );
      return {
        event: result.event,
        incident: evidence
          ? await this.persistence.findLeakIncidentById(
              context.organization.id,
              evidence.incidentId,
            )
          : undefined,
        correlated: !!evidence,
        duplicate: true,
      };
    }
    await this.audit(
      context,
      "moisture_sensor.event_accepted",
      result.event.id,
      {
        sensorId: sensor.id,
        state: result.event.state,
      },
    );
    if (result.event.state === "dry") {
      return { event: result.event, correlated: false, duplicate: false };
    }

    const settings = await this.persistence.getIncidentCorrelationSettings(
      context.organization.id,
    );
    const incident = await this.findCorrelationCandidate(
      sensor,
      result.event.measuredAt,
      settings,
    );
    if (incident) {
      await this.persistence.createIncidentSensorEvidence({
        createdAt: new Date().toISOString(),
        incidentId: incident.id,
        organizationId: context.organization.id,
        sensorEventId: result.event.id,
        sensorId: sensor.id,
      });
      await this.audit(
        context,
        "moisture_sensor.event_correlated",
        result.event.id,
        {
          incidentId: incident.id,
          sensorId: sensor.id,
        },
      );
      return {
        event: result.event,
        incident,
        correlated: true,
        duplicate: false,
      };
    }

    const createdIncident = await this.persistence.createLeakIncident({
      buildingId: sensor.buildingId,
      description: `Moisture sensor ${sensor.name} reported wet conditions.`,
      detectedAt: result.event.measuredAt,
      organizationId: context.organization.id,
      severity: "warning",
      source: "moisture_sensor",
      title: "Moisture detected",
      unitId: sensor.unitId,
    });
    const now = new Date().toISOString();
    await this.persistence.createIncidentActivity({
      actorUserId: context.user.id,
      createdAt: now,
      incidentId: createdIncident.id,
      organizationId: context.organization.id,
      summary: "Moisture sensor reported wet conditions",
      type: "opened",
    });
    await this.persistence.createIncidentSensorEvidence({
      createdAt: now,
      incidentId: createdIncident.id,
      organizationId: context.organization.id,
      sensorEventId: result.event.id,
      sensorId: sensor.id,
    });
    await this.notifications.notifyIncidentOpened(createdIncident);
    return {
      event: result.event,
      incident: createdIncident,
      correlated: false,
      duplicate: false,
    };
  }

  getCorrelationSettings(context: RequestContext) {
    return this.persistence.getIncidentCorrelationSettings(
      context.organization.id,
    );
  }

  async updateCorrelationSettings(
    context: RequestContext,
    dto: UpdateIncidentCorrelationSettingsRequest,
  ) {
    const current = await this.persistence.getIncidentCorrelationSettings(
      context.organization.id,
    );
    const moistureCorrelationWindowMinutes =
      dto.moistureCorrelationWindowMinutes ??
      current.moistureCorrelationWindowMinutes;
    if (
      !Number.isInteger(moistureCorrelationWindowMinutes) ||
      moistureCorrelationWindowMinutes < 1 ||
      moistureCorrelationWindowMinutes > 1440
    ) {
      throw new ApiError(
        "MOISTURE_CORRELATION_WINDOW_INVALID",
        "moistureCorrelationWindowMinutes must be an integer between 1 and 1440",
        HttpStatus.BAD_REQUEST,
      );
    }
    const settings = await this.persistence.upsertIncidentCorrelationSettings({
      moistureCorrelationWindowMinutes,
      organizationId: context.organization.id,
      updatedAt: new Date().toISOString(),
    });
    await this.audit(
      context,
      "incident_correlation_settings.updated",
      settings.organizationId,
      {
        moistureCorrelationWindowMinutes,
      },
    );
    return settings;
  }

  private async findCorrelationCandidate(
    sensor: MoistureSensor,
    measuredAt: string,
    settings: IncidentCorrelationSettings,
  ) {
    const timestamp = new Date(measuredAt).getTime();
    const windowMs = settings.moistureCorrelationWindowMinutes * 60_000;
    const candidates = (
      await this.persistence.listLeakIncidents({
        buildingId: sensor.buildingId,
        organizationId: sensor.organizationId,
        source: "meter_anomaly",
      })
    )
      .filter(
        (incident) =>
          incident.status !== "resolved" &&
          (sensor.unitId
            ? incident.unitId === sensor.unitId
            : incident.unitId === undefined),
      )
      .filter(
        (incident) =>
          Math.abs(new Date(incident.detectedAt).getTime() - timestamp) <=
          windowMs,
      )
      .sort(
        (left, right) =>
          Math.abs(new Date(left.detectedAt).getTime() - timestamp) -
          Math.abs(new Date(right.detectedAt).getTime() - timestamp),
      );
    return candidates[0];
  }

  private async requireSensor(context: RequestContext, sensorId: string) {
    const sensor = await this.persistence.findMoistureSensorById(
      context.organization.id,
      sensorId,
    );
    if (!sensor) throw tenantResourceNotFound("Moisture sensor");
    return sensor;
  }

  private async audit(
    context: RequestContext,
    action: string,
    targetId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.persistence.createAuditLog({
      action,
      actorUserId: context.user.id,
      metadata,
      organizationId: context.organization.id,
      targetId,
      targetType: "moisture_sensor",
    });
  }
}
