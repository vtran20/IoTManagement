import type {
  BuildingResponse,
  CreateAlertRuleRequest,
  CreateBuildingRequest,
  CreateMeterRequest,
  CreateReportRequest,
  CreateUnitRequest,
  DashboardSummaryResponse,
  HealthResponse,
  IngestReadingRequest,
  IngestReadingResponse,
  ListAlertsQuery,
  ListBuildingsQuery,
  ListMetersQuery,
  ListReadingsQuery,
  ListReportsQuery,
  ListUnitsQuery,
  LoginRequest,
  LoginResponse,
  MeterResponse,
  PageResponse,
  ReadingResponse,
  ReportResponse,
  UnitResponse,
  UpdateAlertRuleRequest,
  UpdateBuildingRequest,
  UpdateMeterRequest,
  UpdateUnitRequest,
  AlertEventResponse,
  AlertRuleResponse,
} from "@iot-management/types";
import type { ApiClient } from "./client";

export function createEndpoints(client: ApiClient) {
  return {
    alerts: {
      acknowledge: (alertId: string) =>
        client.post<AlertEventResponse>(`/alerts/${alertId}/acknowledge`),
      createRule: (body: CreateAlertRuleRequest) =>
        client.post<AlertRuleResponse>("/alerts/rules", { body }),
      list: (query?: ListAlertsQuery) =>
        client.get<PageResponse<AlertEventResponse>>("/alerts", { query }),
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
      summary: () => client.get<DashboardSummaryResponse>("/dashboard/summary"),
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
