import { AppShell } from "../../components/app-shell";
import { IncidentsPanel } from "../../features/incidents/incidents-panel";

export default function IncidentsPage() {
  return (
    <AppShell title="Water Incidents">
      <section className="page-header">
        <h2>Water Incidents</h2>
        <p>
          Investigate leak evidence, coordinate repairs, and track resolution.
        </p>
      </section>
      <IncidentsPanel />
    </AppShell>
  );
}
