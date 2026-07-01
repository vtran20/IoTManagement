import { AppShell } from "../../components/app-shell";
import { DashboardOverview } from "../../features/dashboard/dashboard-overview";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;

  return (
    <AppShell title="Overview">
      <DashboardOverview state={params.state} />
    </AppShell>
  );
}
