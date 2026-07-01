"use client";

import { useMemo } from "react";
import type { Building, Meter, PageResponse } from "@iot-management/types";
import { useApiResource } from "../../lib/use-api-resource";

export function BuildingsTable() {
  const buildings = useApiResource<PageResponse<Building>>("/buildings");
  const meters = useApiResource<PageResponse<Meter>>("/meters");
  const meterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (meters.status === "ready") {
      for (const meter of meters.data.items) {
        counts.set(meter.buildingId, (counts.get(meter.buildingId) ?? 0) + 1);
      }
    }
    return counts;
  }, [meters]);

  if (buildings.status === "loading" || meters.status === "loading") {
    return <section className="state-panel">Loading buildings</section>;
  }

  if (buildings.status === "error" || meters.status === "error") {
    return (
      <section className="state-panel error-state">
        Building data is unavailable
      </section>
    );
  }

  return (
    <div className="data-panel">
      {buildings.data.items.length === 0 ? <p>No buildings found.</p> : null}
      <table>
        <thead>
          <tr>
            <th>Building</th>
            <th>Address</th>
            <th>Meters</th>
            <th>Timezone</th>
          </tr>
        </thead>
        <tbody>
          {buildings.data.items.map((building) => (
            <tr key={building.id}>
              <td>
                <a href={`/buildings/${building.id}`}>{building.name}</a>
              </td>
              <td>{building.address}</td>
              <td>{meterCounts.get(building.id) ?? 0}</td>
              <td>{building.timezone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
