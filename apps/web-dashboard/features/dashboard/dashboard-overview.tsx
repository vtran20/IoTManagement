"use client";

import { useDashboardOverview } from "../../lib/dashboard-query";
import { BuildingBreakdownChart } from "./building-breakdown-chart";
import { OverviewCards } from "./overview-cards";
import { UnitRankingsTable } from "./unit-rankings-table";
import { UsageTrendChart } from "./usage-trend-chart";

export function DashboardOverview({ state }: { state?: string }) {
  const dashboard = useDashboardOverview();

  if (state === "loading" || dashboard.isPending) {
    return <div className="state-panel">Loading dashboard data</div>;
  }
  if (state === "error" || (dashboard.isError && !dashboard.data)) {
    return (
      <div className="state-panel error-state">
        Dashboard data is unavailable
      </div>
    );
  }
  const overview = dashboard.data;
  if (
    state === "empty" ||
    !overview ||
    overview.summary.utilitySummaries.length === 0 ||
    overview.trends.items.length === 0
  ) {
    return <div className="state-panel">No utility data yet</div>;
  }

  return (
    <>
      {dashboard.isError ? (
        <div className="state-panel stale-state">
          Showing cached dashboard data
        </div>
      ) : null}
      <OverviewCards
        deviceHealth={overview.deviceHealth}
        summary={overview.summary}
      />
      <UsageTrendChart
        summary={overview.summary}
        trends={overview.trends.items}
      />
      <BuildingBreakdownChart rows={overview.buildings.items} />
      <UnitRankingsTable rows={overview.units.items} />
    </>
  );
}
