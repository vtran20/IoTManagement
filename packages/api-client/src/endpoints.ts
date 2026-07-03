import type {
  BuildingResponse,
  CreateAlertRuleRequest,
  CreateBuildingRequest,
  CreateFloorRequest,
  CreateMeterRequest,
  CreateMoistureSensorRequest,
  CreateReportRequest,
  CreateUnitRequest,
  DeviceHealthResponse,
  DemoSeedResponse,
  DashboardSummaryResponse,
  DashboardOverviewQuery,
  DashboardOverviewResponse,
  DashboardAlertsResponse,
  BuildingBreakdownItem,
  UnitRankingItem,
  UsageTrendPoint,
  HealthResponse,
  IngestReadingRequest,
  IngestReadingResponse,
  IngestMoistureSensorEventRequest,
  IncidentNotificationResponse,
  IncidentResponderSettingsResponse,
  CreateIncidentNoteRequest,
  CreateManualLeakIncidentRequest,
  CreateWorkOrderRequest,
  LeakIncidentDetailResponse,
  LeakIncidentResponse,
  ListLeakIncidentsQuery,
  ListWorkOrdersQuery,
  ListAlertsQuery,
  ListBuildingsQuery,
  ListMetersQuery,
  MonthlyUsageReportQuery,
  MonthlyUsageReportResponse,
  ListReadingsQuery,
  ListReportsQuery,
  ListUnitsQuery,
  ListUsageQuery,
  LoginRequest,
  LoginResponse,
  MeterResponse,
  MoistureSensorIngestResponse,
  MoistureSensorResponse,
  PageResponse,
  ReadingResponse,
  ResolveLeakIncidentRequest,
  ReportResponse,
  RunSimulationRequest,
  RunSimulationResponse,
  UnitResponse,
  UpdateAlertRuleRequest,
  UpdateBuildingRequest,
  UpdateFloorRequest,
  UpdateMeterRequest,
  UpdateMoistureSensorRequest,
  UpdateIncidentCorrelationSettingsRequest,
  IncidentCorrelationSettingsResponse,
  UpdateIncidentResponderSettingsRequest,
  UpdateUnitRequest,
  UpdateWorkOrderRequest,
  WorkOrderResponse,
  AlertEventResponse,
  AlertRuleResponse,
  FloorResponse,
} from "@iot-management/types";
import type { ApiClient } from "./client";

export function createEndpoints(client: ApiClient) {
  return {
    alerts: {
      acknowledge: (alertId: string) =>
        client.post<AlertEventResponse>(`/alerts/${alertId}/acknowledge`),
      createRule: (body: CreateAlertRuleRequest) =>
        client.post<AlertRuleResponse>("/alerts/rules", { body }),
      evaluate: (body?: { now?: string }) =>
        client.post<{ createdCount: number; events: AlertEventResponse[] }>(
          "/alerts/evaluate",
          { body },
        ),
      list: (query?: ListAlertsQuery) =>
        client.get<PageResponse<AlertEventResponse>>("/alerts", { query }),
      listRules: () =>
        client.get<PageResponse<AlertRuleResponse>>("/alerts/rules"),
      resolve: (alertId: string) =>
        client.post<AlertEventResponse>(`/alerts/${alertId}/resolve`),
      updateRule: (ruleId: string, body: UpdateAlertRuleRequest) =>
        client.patch<AlertRuleResponse>(`/alerts/rules/${ruleId}`, { body }),
    },
    auth: {
      login: (body: LoginRequest) =>
        client.post<LoginResponse>("/auth/login", { body }),
    },
    buildings: {
      create: (body: CreateBuildingRequest) =>
        client.post<BuildingResponse>("/buildings", { body }),
      get: (buildingId: string) =>
        client.get<BuildingResponse>(`/buildings/${buildingId}`),
      list: (query?: ListBuildingsQuery) =>
        client.get<PageResponse<BuildingResponse>>("/buildings", { query }),
      update: (buildingId: string, body: UpdateBuildingRequest) =>
        client.patch<BuildingResponse>(`/buildings/${buildingId}`, { body }),
    },
    dashboard: {
      buildings: (query?: ListUsageQuery) =>
        client.get<PageResponse<BuildingBreakdownItem>>(
          "/dashboard/buildings",
          { query },
        ),
      deviceHealth: () =>
        client.get<DeviceHealthResponse>("/dashboard/device-health"),
      alerts: () => client.get<DashboardAlertsResponse>("/dashboard/alerts"),
      overview: (query?: DashboardOverviewQuery) =>
        client.get<DashboardOverviewResponse>("/dashboard/overview", {
          query,
        }),
      summary: () => client.get<DashboardSummaryResponse>("/dashboard/summary"),
      trends: (query?: ListUsageQuery) =>
        client.get<PageResponse<UsageTrendPoint>>("/dashboard/trends", {
          query,
        }),
      units: (query?: ListUsageQuery) =>
        client.get<PageResponse<UnitRankingItem>>("/dashboard/units", {
          query,
        }),
    },
    floors: {
      create: (body: CreateFloorRequest) =>
        client.post<FloorResponse>("/floors", { body }),
      get: (floorId: string) => client.get<FloorResponse>(`/floors/${floorId}`),
      list: (buildingId?: string) =>
        client.get<PageResponse<FloorResponse>>("/floors", {
          query: buildingId ? { buildingId } : undefined,
        }),
      update: (floorId: string, body: UpdateFloorRequest) =>
        client.patch<FloorResponse>(`/floors/${floorId}`, { body }),
    },
    health: () => client.get<HealthResponse>("/health"),
    incidents: {
      acknowledge: (incidentId: string) =>
        client.post<LeakIncidentResponse>(
          `/incidents/${incidentId}/acknowledge`,
        ),
      addNote: (incidentId: string, body: CreateIncidentNoteRequest) =>
        client.post(`/incidents/${incidentId}/notes`, { body }),
      contain: (incidentId: string) =>
        client.post<LeakIncidentResponse>(`/incidents/${incidentId}/contain`),
      createManual: (body: CreateManualLeakIncidentRequest) =>
        client.post<LeakIncidentResponse>("/incidents/manual", { body }),
      createWorkOrder: (incidentId: string, body: CreateWorkOrderRequest) =>
        client.post<WorkOrderResponse>(`/incidents/${incidentId}/work-orders`, {
          body,
        }),
      get: (incidentId: string) =>
        client.get<LeakIncidentDetailResponse>(`/incidents/${incidentId}`),
      investigate: (incidentId: string) =>
        client.post<LeakIncidentResponse>(
          `/incidents/${incidentId}/investigate`,
        ),
      list: (query?: ListLeakIncidentsQuery) =>
        client.get<PageResponse<LeakIncidentResponse>>("/incidents", { query }),
      monitor: (incidentId: string) =>
        client.post<LeakIncidentResponse>(`/incidents/${incidentId}/monitor`),
      resolve: (incidentId: string, body: ResolveLeakIncidentRequest) =>
        client.post<LeakIncidentResponse>(`/incidents/${incidentId}/resolve`, {
          body,
        }),
    },
    incidentResponderSettings: {
      get: () =>
        client.get<IncidentResponderSettingsResponse>(
          "/incident-responder-settings",
        ),
      update: (body: UpdateIncidentResponderSettingsRequest) =>
        client.patch<IncidentResponderSettingsResponse>(
          "/incident-responder-settings",
          { body },
        ),
    },
    incidentCorrelationSettings: {
      get: () =>
        client.get<IncidentCorrelationSettingsResponse>(
          "/incident-correlation-settings",
        ),
      update: (body: UpdateIncidentCorrelationSettingsRequest) =>
        client.patch<IncidentCorrelationSettingsResponse>(
          "/incident-correlation-settings",
          { body },
        ),
    },
    meters: {
      create: (body: CreateMeterRequest) =>
        client.post<MeterResponse>("/meters", { body }),
      get: (meterId: string) => client.get<MeterResponse>(`/meters/${meterId}`),
      list: (query?: ListMetersQuery) =>
        client.get<PageResponse<MeterResponse>>("/meters", { query }),
      readings: (meterId: string, query?: ListReadingsQuery) =>
        client.get<PageResponse<ReadingResponse>>(
          `/meters/${meterId}/readings`,
          {
            query,
          },
        ),
      update: (meterId: string, body: UpdateMeterRequest) =>
        client.patch<MeterResponse>(`/meters/${meterId}`, { body }),
    },
    moistureSensors: {
      create: (body: CreateMoistureSensorRequest) =>
        client.post<MoistureSensorResponse>("/moisture-sensors", { body }),
      get: (sensorId: string) =>
        client.get<MoistureSensorResponse>(`/moisture-sensors/${sensorId}`),
      ingest: (sensorId: string, body: IngestMoistureSensorEventRequest) =>
        client.post<MoistureSensorIngestResponse>(
          `/moisture-sensors/${sensorId}/events`,
          { body },
        ),
      list: (buildingId?: string) =>
        client.get<{ items: MoistureSensorResponse[] }>("/moisture-sensors", {
          query: buildingId ? { buildingId } : undefined,
        }),
      update: (sensorId: string, body: UpdateMoistureSensorRequest) =>
        client.patch<MoistureSensorResponse>(`/moisture-sensors/${sensorId}`, {
          body,
        }),
    },
    notifications: {
      list: () =>
        client.get<{ items: IncidentNotificationResponse[] }>("/notifications"),
      markRead: (notificationId: string) =>
        client.post<IncidentNotificationResponse>(
          `/notifications/${notificationId}/read`,
        ),
    },
    readings: {
      ingest: (body: IngestReadingRequest) =>
        client.post<IngestReadingResponse>("/readings/ingest", { body }),
    },
    simulations: {
      demoSeed: () => client.post<DemoSeedResponse>("/simulations/demo-seed"),
      run: (body: RunSimulationRequest) =>
        client.post<RunSimulationResponse>("/simulations/run", { body }),
    },
    reports: {
      create: (body: CreateReportRequest) =>
        client.post<ReportResponse>("/reports", { body }),
      get: (reportId: string) =>
        client.get<ReportResponse>(`/reports/${reportId}`),
      list: (query?: ListReportsQuery) =>
        client.get<PageResponse<ReportResponse>>("/reports", { query }),
      monthlyUsage: (query: MonthlyUsageReportQuery) =>
        client.get<MonthlyUsageReportResponse>("/reports/monthly-usage", {
          query,
        }),
    },
    units: {
      create: (body: CreateUnitRequest) =>
        client.post<UnitResponse>("/units", { body }),
      get: (unitId: string) => client.get<UnitResponse>(`/units/${unitId}`),
      list: (query?: ListUnitsQuery) =>
        client.get<PageResponse<UnitResponse>>("/units", { query }),
      update: (unitId: string, body: UpdateUnitRequest) =>
        client.patch<UnitResponse>(`/units/${unitId}`, { body }),
    },
    workOrders: {
      get: (workOrderId: string) =>
        client.get<WorkOrderResponse>(`/work-orders/${workOrderId}`),
      list: (query?: ListWorkOrdersQuery) =>
        client.get<PageResponse<WorkOrderResponse>>("/work-orders", { query }),
      update: (workOrderId: string, body: UpdateWorkOrderRequest) =>
        client.patch<WorkOrderResponse>(`/work-orders/${workOrderId}`, {
          body,
        }),
    },
  };
}
