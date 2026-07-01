"use client";

import { useMemo, useState } from "react";
import type {
  Building,
  Meter,
  PageResponse,
  Unit,
  UtilityType,
} from "@iot-management/types";
import { useApiResource } from "../../lib/use-api-resource";

export function UnitsTable() {
  const [utility, setUtility] = useState<UtilityType | "all">("all");
  const units = useApiResource<PageResponse<Unit>>("/units");
  const meters = useApiResource<PageResponse<Meter>>("/meters");
  const buildings = useApiResource<PageResponse<Building>>("/buildings");
  const buildingNames = useMemo(() => {
    const names = new Map<string, string>();
    if (buildings.status === "ready") {
      for (const building of buildings.data.items) {
        names.set(building.id, building.name);
      }
    }
    return names;
  }, [buildings]);

  if (
    units.status === "loading" ||
    meters.status === "loading" ||
    buildings.status === "loading"
  ) {
    return <section className="state-panel">Loading units</section>;
  }

  if (
    units.status === "error" ||
    meters.status === "error" ||
    buildings.status === "error"
  ) {
    return (
      <section className="state-panel error-state">
        Unit data is unavailable
      </section>
    );
  }

  const visibleUnits = units.data.items.filter((unit) => {
    if (utility === "all") {
      return true;
    }
    return meters.data.items.some(
      (meter) => meter.unitId === unit.id && meter.utilityType === utility,
    );
  });

  return (
    <div className="data-panel">
      <label className="field compact-field">
        <span>Utility filter</span>
        <select
          aria-label="Utility filter"
          value={utility}
          onChange={(event) =>
            setUtility(event.target.value as UtilityType | "all")
          }
        >
          <option value="all">All</option>
          <option value="water">Water</option>
          <option value="electric">Electric</option>
        </select>
      </label>
      {visibleUnits.length === 0 ? <p>No units match this filter.</p> : null}
      <table>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Building</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {visibleUnits.map((unit) => (
            <tr key={unit.id}>
              <td>
                <a href={`/units/${unit.id}`}>{unit.name}</a>
              </td>
              <td>{buildingNames.get(unit.buildingId) ?? unit.buildingId}</td>
              <td>{unit.occupancyStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
