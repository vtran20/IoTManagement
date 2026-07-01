"use client";

import { useMemo } from "react";
import type {
  Building,
  Meter,
  PageResponse,
  Unit,
} from "@iot-management/types";
import { useApiResource } from "../../lib/use-api-resource";

export function MetersTable() {
  const meters =
    useApiResource<PageResponse<Meter & { label?: string }>>("/meters");
  const buildings = useApiResource<PageResponse<Building>>("/buildings");
  const units = useApiResource<PageResponse<Unit>>("/units");
  const buildingNames = useMemo(
    () => mapNames(buildings.status === "ready" ? buildings.data.items : []),
    [buildings],
  );
  const unitNames = useMemo(
    () => mapNames(units.status === "ready" ? units.data.items : []),
    [units],
  );

  if (
    meters.status === "loading" ||
    buildings.status === "loading" ||
    units.status === "loading"
  ) {
    return <section className="state-panel">Loading meters</section>;
  }

  if (
    meters.status === "error" ||
    buildings.status === "error" ||
    units.status === "error"
  ) {
    return (
      <section className="state-panel error-state">
        Meter data is unavailable
      </section>
    );
  }

  return (
    <div className="data-panel">
      {meters.data.items.length === 0 ? <p>No meters found.</p> : null}
      <table>
        <thead>
          <tr>
            <th>Meter</th>
            <th>External ID</th>
            <th>Utility</th>
            <th>Status</th>
            <th>Assignment</th>
          </tr>
        </thead>
        <tbody>
          {meters.data.items.map((meter) => (
            <tr key={meter.id}>
              <td>
                <a href={`/meters/${meter.id}`}>{meter.label ?? meter.id}</a>
              </td>
              <td>{meter.externalId}</td>
              <td>{meter.utilityType}</td>
              <td>
                <span className={`status-pill ${meter.status}`}>
                  {meter.status}
                </span>
              </td>
              <td>
                {buildingNames.get(meter.buildingId) ?? meter.buildingId} /{" "}
                {meter.unitId
                  ? (unitNames.get(meter.unitId) ?? meter.unitId)
                  : "Building shared"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function mapNames(items: Array<{ id: string; name: string }>) {
  return new Map(items.map((item) => [item.id, item.name]));
}
