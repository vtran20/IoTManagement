import { AppShell } from "../../components/app-shell";
import { UnitsTable } from "../../features/units/units-table";

export default function UnitsPage() {
  return (
    <AppShell title="Units">
      <section className="page-header">
        <h2>Unit Directory</h2>
        <p>Occupancy and utility assignment</p>
      </section>
      <UnitsTable />
    </AppShell>
  );
}
