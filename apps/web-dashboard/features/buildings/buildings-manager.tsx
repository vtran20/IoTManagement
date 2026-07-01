"use client";

import { FormEvent, useState } from "react";
import type { Building } from "@iot-management/types";
import { buildings as fixtureBuildings, meters } from "../../lib/api";

export function BuildingsManager() {
  const [items, setItems] = useState<Building[]>(
    fixtureBuildings.map((building) => ({
      ...building,
      lifecycleStatus: building.lifecycleStatus ?? "active",
    })),
  );

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      return;
    }
    setItems((current) => [
      ...current,
      {
        address: String(data.get("address") ?? "").trim() || undefined,
        id: `building_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        lifecycleStatus: "active",
        name,
        organizationId: "org_north",
        timezone: "America/Detroit",
      },
    ]);
    form.reset();
  }

  function setArchived(buildingId: string, archived: boolean) {
    setItems((current) =>
      current.map((building) =>
        building.id === buildingId
          ? {
              ...building,
              archivedAt: archived ? new Date().toISOString() : undefined,
              lifecycleStatus: archived ? "archived" : "active",
            }
          : building,
      ),
    );
  }

  return (
    <>
      <form className="data-panel portfolio-form" onSubmit={create}>
        <label className="field">
          <span>Building name</span>
          <input name="name" required type="text" />
        </label>
        <label className="field">
          <span>Address</span>
          <input name="address" type="text" />
        </label>
        <button className="primary-button" type="submit">
          Create building
        </button>
      </form>

      <div className="data-panel">
        <table>
          <thead>
            <tr>
              <th>Building</th>
              <th>Address</th>
              <th>Meters</th>
              <th>Timezone</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((building) => {
              const archived = building.lifecycleStatus === "archived";
              return (
                <tr key={building.id}>
                  <td>
                    <a href={`/buildings/${building.id}`}>{building.name}</a>
                  </td>
                  <td>{building.address}</td>
                  <td>
                    {
                      meters.filter((meter) => meter.buildingId === building.id)
                        .length
                    }
                  </td>
                  <td>{building.timezone}</td>
                  <td>{building.lifecycleStatus ?? "active"}</td>
                  <td>
                    <button
                      className="mode-button"
                      onClick={() => setArchived(building.id, !archived)}
                      type="button"
                    >
                      {archived ? "Restore" : "Archive"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
