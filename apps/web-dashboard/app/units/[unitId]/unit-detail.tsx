"use client";

import type {
  Building,
  Meter,
  PageResponse,
  Unit,
} from "@iot-management/types";
import { AppShell } from "../../../components/app-shell";
import { useApiResource } from "../../../lib/use-api-resource";

export function UnitDetail({ unitId }: { unitId: string }) {
  const unit = useApiResource<Unit>(`/units/${unitId}`);
  const meters = useApiResource<PageResponse<Meter & { label?: string }>>(
    `/meters?unitId=${encodeURIComponent(unitId)}`,
  );
  const buildings = useApiResource<PageResponse<Building>>("/buildings");

  if (
    unit.status === "loading" ||
    meters.status === "loading" ||
    buildings.status === "loading"
  ) {
    return (
      <AppShell title="Unit Detail">
        <section className="state-panel">Loading unit</section>
      </AppShell>
    );
  }

  if (
    unit.status === "error" ||
    meters.status === "error" ||
    buildings.status === "error"
  ) {
    return (
      <AppShell title="Unit Detail">
        <section className="state-panel error-state">
          Unit data is unavailable
        </section>
      </AppShell>
    );
  }

  const buildingName =
    buildings.data.items.find(
      (building) => building.id === unit.data.buildingId,
    )?.name ?? "Unknown building";

  return (
    <AppShell title="Unit Detail">
      <section className="page-header">
        <h2>{unit.data.name}</h2>
        <p>{buildingName} unit assignment</p>
      </section>
      <div className="data-panel">
        {meters.data.items.length === 0 ? <p>No meters assigned.</p> : null}
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
            {meters.data.items.map((meter) => (
              <tr key={meter.id}>
                <td>
                  <a href={`/meters/${meter.id}`}>
                    {meter.label ?? meter.externalId}
                  </a>
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
