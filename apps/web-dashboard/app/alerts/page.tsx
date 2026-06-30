import { AppShell } from "../../components/app-shell";
import { AlertsTable } from "../../features/alerts/alerts-table";

export default function AlertsPage() {
  return (
    <AppShell title="Alerts">
      <section className="page-header">
        <h2>Alert Events</h2>
        <p>Open utility events</p>
      </section>
      <AlertsTable />
    </AppShell>
  );
}
