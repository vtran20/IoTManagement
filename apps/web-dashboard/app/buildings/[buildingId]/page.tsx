import { AppShell } from "../../../components/app-shell";
import { buildingName, meters } from "../../../lib/api";

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { buildingId } = await params;
  const name = buildingName(buildingId);
  const buildingMeters = meters.filter(
    (meter) => meter.buildingId === buildingId,
  );

  return (
    <AppShell title="Building Detail">
      <section className="page-header">
        <h2>{name}</h2>
        <p>Meter assignments and utility status</p>
      </section>
      <div className="data-panel">
        <table>
          <thead>
            <tr>
              <th>Meter</th>
              <th>External ID</th>
              <th>Utility</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {buildingMeters.map((meter) => (
              <tr key={meter.id}>
                <td>{meter.label}</td>
                <td>{meter.externalId}</td>
                <td>{meter.utilityType}</td>
                <td>{meter.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
