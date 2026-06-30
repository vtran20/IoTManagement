import { AppShell } from "../../components/app-shell";
import { BuildingBreakdownChart } from "../../features/dashboard/building-breakdown-chart";
import { OverviewCards } from "../../features/dashboard/overview-cards";
import { UnitRankingsTable } from "../../features/dashboard/unit-rankings-table";
import { UsageTrendChart } from "../../features/dashboard/usage-trend-chart";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;

  return (
    <AppShell title="Overview">
      {params.state === "loading" ? (
        <div className="state-panel">Loading dashboard data</div>
      ) : params.state === "empty" ? (
        <div className="state-panel">No utility data yet</div>
      ) : params.state === "error" ? (
        <div className="state-panel error-state">
          Dashboard data is unavailable
        </div>
      ) : (
        <>
          <OverviewCards />
          <UsageTrendChart />
          <BuildingBreakdownChart />
          <UnitRankingsTable />
        </>
      )}
    </AppShell>
  );
}
