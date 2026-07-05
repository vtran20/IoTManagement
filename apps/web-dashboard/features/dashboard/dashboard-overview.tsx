"use client";

import {
  useDashboardOperations,
  useDashboardOverview,
} from "../../lib/dashboard-query";
import { BuildingBreakdownChart } from "./building-breakdown-chart";
import { OverviewCards } from "./overview-cards";
import { OperationsSummary } from "./operations-summary";
import { OperationsToday } from "./operations-today";
import { UnitRankingsTable } from "./unit-rankings-table";
import { UsageTrendChart } from "./usage-trend-chart";

export function DashboardOverview({ state }: { state?: string }) {
  const dashboard = useDashboardOverview();
  const operations = useDashboardOperations();

  if (state === "loading") {
    return <div className="state-panel">Loading dashboard data</div>;
  }
  if (state === "error") {
    return (
      <div className="state-panel error-state">
        Dashboard data is unavailable
      </div>
    );
  }
  const overview = dashboard.data;
  if (state === "empty") {
    return <div className="state-panel">No utility data yet</div>;
  }

  return (
    <>
      {operations.data ? (
        <OperationsSummary operations={operations.data} />
      ) : null}
      <OperationsToday />
      {dashboard.isPending ? (
        <div className="state-panel">Loading dashboard data</div>
      ) : null}
      {dashboard.isError && !overview ? (
        <div className="state-panel error-state">
          Dashboard data is unavailable
        </div>
      ) : null}
      {overview &&
      (overview.summary.utilitySummaries.length === 0 ||
        overview.trends.items.length === 0) ? (
        <div className="state-panel">No utility data yet</div>
      ) : null}
      {dashboard.isError ? (
        <div className="state-panel stale-state">
          Showing cached dashboard data
        </div>
      ) : null}
      {overview &&
      overview.summary.utilitySummaries.length > 0 &&
      overview.trends.items.length > 0 ? (
        <>
          <OverviewCards range={overview.range} summary={overview.summary} />
          <UsageTrendChart
            range={overview.range}
            summary={overview.summary}
            trends={overview.trends.items}
          />
          <BuildingBreakdownChart rows={overview.buildings.items} />
          <UnitRankingsTable rows={overview.units.items} />
        </>
      ) : null}
    </>
  );
}
