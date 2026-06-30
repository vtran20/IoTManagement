import { AppShell } from "../../components/app-shell";
import { MetersTable } from "../../features/meters/meters-table";

export default function MetersPage() {
  return (
    <AppShell title="Meters">
      <section className="page-header">
        <h2>Meter Inventory</h2>
        <p>Device health and assignment</p>
      </section>
      <MetersTable />
    </AppShell>
  );
}
