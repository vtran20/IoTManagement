import { AppShell } from "../../../components/app-shell";
import { buildingName, meters, units } from "../../../lib/api";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const unit = units.find((candidate) => candidate.id === unitId);
  const unitMeters = meters.filter((meter) => meter.unitId === unitId);
  const name = unit?.name ?? unitId;

  return (
    <AppShell title="Unit Detail">
      <section className="page-header">
        <h2>{name}</h2>
        <p>
          {unit ? buildingName(unit.buildingId) : "Unknown building"} unit
          assignment
        </p>
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
            {unitMeters.map((meter) => (
              <tr key={meter.id}>
                <td>
                  <a href={`/meters/${meter.id}`}>{meter.label}</a>
                </td>
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
