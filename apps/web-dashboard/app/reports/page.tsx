import { AppShell } from "../../components/app-shell";
import { ReportsPanel } from "../../features/reports/reports-panel";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;

  return (
    <AppShell title="Reports">
      <ReportsPanel state={params.state} />
    </AppShell>
  );
}
