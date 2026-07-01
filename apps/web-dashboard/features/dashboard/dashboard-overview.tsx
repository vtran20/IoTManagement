"use client";

import type {
  BuildingBreakdownItem,
  DashboardSummaryResponse,
  DeviceHealthResponse,
  PageResponse,
  UnitRankingItem,
  UsageTrendPoint,
} from "@iot-management/types";
import { useApiResource } from "../../lib/use-api-resource";
import { BuildingBreakdownChart } from "./building-breakdown-chart";
import { OverviewCards } from "./overview-cards";
import { UnitRankingsTable } from "./unit-rankings-table";
import { UsageTrendChart } from "./usage-trend-chart";

export function DashboardOverview({ state }: { state?: string }) {
  const summary =
    useApiResource<DashboardSummaryResponse>("/dashboard/summary");
  const trends =
    useApiResource<PageResponse<UsageTrendPoint>>("/dashboard/trends");
  const buildings = useApiResource<PageResponse<BuildingBreakdownItem>>(
    "/dashboard/buildings",
  );
  const units =
    useApiResource<PageResponse<UnitRankingItem>>("/dashboard/units");
  const deviceHealth = useApiResource<DeviceHealthResponse>(
    "/dashboard/device-health",
  );

  if (state === "loading" || isLoading(summary, trends, buildings, units)) {
    return <div className="state-panel">Loading dashboard data</div>;
  }
  if (state === "error" || isError(summary, trends, buildings, units)) {
    return (
      <div className="state-panel error-state">
        Dashboard data is unavailable
      </div>
    );
  }
  const summaryData = summary.data;
  const trendData = trends.data;
  const buildingData = buildings.data;
  const unitData = units.data;
  if (
    state === "empty" ||
    !summaryData ||
    !trendData ||
    !buildingData ||
    !unitData ||
    summaryData.utilitySummaries.length === 0 ||
    trendData.items.length === 0
  ) {
    return <div className="state-panel">No utility data yet</div>;
  }

  return (
    <>
      <OverviewCards
        deviceHealth={
          deviceHealth.status === "ready" ? deviceHealth.data : undefined
        }
        summary={summaryData}
      />
      <UsageTrendChart summary={summaryData} trends={trendData.items} />
      <BuildingBreakdownChart rows={buildingData.items} />
      <UnitRankingsTable rows={unitData.items} />
    </>
  );
}

function isLoading(...states: Array<{ status: string }>): boolean {
  return states.some((state) => state.status === "loading");
}

function isError(...states: Array<{ status: string }>): boolean {
  return states.some((state) => state.status === "error");
}
