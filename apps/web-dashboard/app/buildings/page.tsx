import { AppShell } from "../../components/app-shell";
import { BuildingsManager } from "../../features/buildings/buildings-manager";

export default function BuildingsPage() {
  return (
    <AppShell title="Buildings">
      <section className="page-header">
        <h2>Portfolio</h2>
        <p>North Properties portfolio</p>
      </section>
      <BuildingsManager />
    </AppShell>
  );
}
