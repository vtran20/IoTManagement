import { AppShell } from "../../components/app-shell";
import { WorkOrdersPanel } from "../../features/work-orders/work-orders-panel";

export default function WorkOrdersPage() {
  return (
    <AppShell title="Repair Work Orders">
      <section className="page-header">
        <h2>Repair Work Orders</h2>
        <p>Prioritized repair tasks connected to active water incidents.</p>
      </section>
      <WorkOrdersPanel />
    </AppShell>
  );
}
