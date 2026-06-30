import type {
  BuildingResponse,
  CreateAlertRuleRequest,
  CreateBuildingRequest,
  CreateFloorRequest,
  CreateMeterRequest,
  CreateReportRequest,
  CreateUnitRequest,
  DeviceHealthResponse,
  DashboardSummaryResponse,
  DashboardAlertsResponse,
  BuildingBreakdownItem,
  UnitRankingItem,
  UsageTrendPoint,
  HealthResponse,
  IngestReadingRequest,
  IngestReadingResponse,
  ListAlertsQuery,
  ListBuildingsQuery,
  ListMetersQuery,
  ListReadingsQuery,
  ListReportsQuery,
  ListUnitsQuery,
  ListUsageQuery,
  LoginRequest,
  LoginResponse,
  MeterResponse,
  PageResponse,
  ReadingResponse,
  ReportResponse,
  RunSimulationRequest,
  RunSimulationResponse,
  UnitResponse,
  UpdateAlertRuleRequest,
  UpdateBuildingRequest,
  UpdateFloorRequest,
  UpdateMeterRequest,
  UpdateUnitRequest,
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
    readings: {
      ingest: (body: IngestReadingRequest) =>
        client.post<IngestReadingResponse>("/readings/ingest", { body }),
    },
    simulations: {
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
  };
}
