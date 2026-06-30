import { AppShell } from "../../components/app-shell";
import { BuildingsTable } from "../../features/buildings/buildings-table";

export default function BuildingsPage() {
  return (
    <AppShell title="Buildings">
      <section className="page-header">
        <h2>Portfolio</h2>
        <p>North Properties portfolio</p>
      </section>
      <BuildingsTable />
    </AppShell>
  );
}
