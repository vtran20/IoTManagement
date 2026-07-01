"use client";

import { useState } from "react";
import { buildingName, meters, units } from "../../lib/api";
import type { UtilityType } from "@iot-management/types";

export function UnitsTable() {
  const [utility, setUtility] = useState<UtilityType | "all">("all");
  const visibleUnits = units.filter((unit) => {
    if (utility === "all") {
      return true;
    }
    return meters.some(
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
              <td>{buildingName(unit.buildingId)}</td>
              <td>{unit.occupancyStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
