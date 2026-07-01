"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  Building,
  CreateBuildingRequest,
  Meter,
  PageResponse,
} from "@iot-management/types";
import {
  canMutate,
  fetchJson,
  mutateJson,
  useCurrentSession,
} from "../../lib/use-api-resource";

export function BuildingsManager() {
  const session = useCurrentSession();
  const [items, setItems] = useState<Building[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [status, setStatus] = useState<"error" | "loading" | "ready">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    Promise.all([
      fetchJson<PageResponse<Building>>("/buildings"),
      fetchJson<PageResponse<Meter>>("/meters"),
    ])
      .then(([buildingResponse, meterResponse]) => {
        if (!mounted) return;
        setItems(
          buildingResponse.items.map((building) => ({
            ...building,
            lifecycleStatus: building.lifecycleStatus ?? "active",
          })),
        );
        setMeters(meterResponse.items);
        setStatus("ready");
      })
      .catch(() => {
        if (mounted) setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowMutations) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      return;
    }
    setMessage("");
    try {
      const payload: CreateBuildingRequest = {
        address: String(data.get("address") ?? "").trim() || undefined,
        name,
        timezone: "America/Detroit",
      };
      const building = await mutateJson<Building>("/buildings", {
        body: JSON.stringify(payload),
        method: "POST",
      });
      setItems((current) => [
        ...current,
        {
          ...building,
          lifecycleStatus: building.lifecycleStatus ?? "active",
        },
      ]);
      form.reset();
    } catch {
      setMessage("Building could not be saved.");
    }
  }

  async function setArchived(buildingId: string, archived: boolean) {
    if (!allowMutations) return;
    setMessage("");
    try {
      const building = await mutateJson<Building>(
        `/buildings/${buildingId}/${archived ? "archive" : "restore"}`,
        { method: "POST" },
      );
      setItems((current) =>
        current.map((item) => (item.id === buildingId ? building : item)),
      );
    } catch {
      setMessage("Building status could not be updated.");
    }
  }

  const meterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const meter of meters) {
      counts.set(meter.buildingId, (counts.get(meter.buildingId) ?? 0) + 1);
    }
    return counts;
  }, [meters]);

  if (status === "loading" || session.status === "loading") {
    return <section className="state-panel">Loading buildings</section>;
  }

  if (status === "error" || session.status === "error") {
    return (
      <section className="state-panel error-state">
        Building data is unavailable
      </section>
    );
  }

  return (
    <>
      {allowMutations ? (
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
      ) : null}
      {message ? <p className="form-error">{message}</p> : null}

      <div className="data-panel">
        {items.length === 0 ? <p>No buildings found.</p> : null}
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
                  <td>{meterCounts.get(building.id) ?? 0}</td>
                  <td>{building.timezone}</td>
                  <td>{building.lifecycleStatus ?? "active"}</td>
                  <td>
                    {allowMutations ? (
                      <button
                        className="mode-button"
                        onClick={() => setArchived(building.id, !archived)}
                        type="button"
                      >
                        {archived ? "Restore" : "Archive"}
                      </button>
                    ) : (
                      <span className="muted">Read only</span>
                    )}
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
