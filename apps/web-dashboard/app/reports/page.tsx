import { AppShell } from "../../components/app-shell";
import { MonthlyUsageReport } from "../../features/reports/monthly-usage-report";
import { monthlyUsageReport } from "../../lib/api";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;

  return (
    <AppShell title="Reports">
      {params.state === "empty" ? (
        <section className="state-panel">
          <h2>No report data yet</h2>
          <p>Seed demo data or run monthly aggregation to generate reports.</p>
        </section>
      ) : (
        <MonthlyUsageReport report={monthlyUsageReport} />
      )}
    </AppShell>
  );
}
