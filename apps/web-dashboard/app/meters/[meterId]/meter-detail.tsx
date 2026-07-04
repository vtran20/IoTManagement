"use client";

import { useState } from "react";
import type {
  Building,
  Meter,
  PageResponse,
  Unit,
} from "@iot-management/types";
import { AppShell } from "../../../components/app-shell";
import { Breadcrumbs } from "../../../components/breadcrumbs";
import {
  canMutate,
  mutateJson,
  useApiResource,
  useCurrentSession,
} from "../../../lib/use-api-resource";

export function MeterDetail({ meterId }: { meterId: string }) {
  const meter = useApiResource<Meter & { label?: string }>(
    `/meters/${meterId}`,
  );
  const buildings = useApiResource<PageResponse<Building>>("/buildings");
  const units = useApiResource<PageResponse<Unit>>("/units");
  const session = useCurrentSession();
  const [lifecycleStatus, setLifecycleStatus] =
    useState<Meter["lifecycleStatus"]>();
  const [message, setMessage] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);

  if (
    meter.status === "loading" ||
    buildings.status === "loading" ||
    units.status === "loading" ||
    session.status === "loading"
  ) {
    return (
      <AppShell title="Meter Detail">
        <section className="state-panel">Loading meter</section>
      </AppShell>
    );
  }

  if (
    meter.status === "error" ||
    buildings.status === "error" ||
    units.status === "error" ||
    session.status === "error"
  ) {
    return (
      <AppShell title="Meter Detail">
        <section className="state-panel error-state">
          Meter data is unavailable
        </section>
      </AppShell>
    );
  }

  const archived =
    (lifecycleStatus ?? meter.data.lifecycleStatus) === "archived";
  const name = meter.data.label ?? meter.data.externalId;
  const buildingName =
    buildings.data.items.find(
      (building) => building.id === meter.data.buildingId,
    )?.name ?? "Unknown building";
  const unitName = meter.data.unitId
    ? (units.data.items.find((unit) => unit.id === meter.data.unitId)?.name ??
      meter.data.unitId)
    : "Building shared";

  async function setArchived(nextArchived: boolean) {
    if (!allowMutations) return;
    setMessage("");
    try {
      const updated = await mutateJson<Meter>(
        `/meters/${meterId}/${nextArchived ? "archive" : "restore"}`,
        { method: "POST" },
      );
      setLifecycleStatus(updated.lifecycleStatus ?? "active");
    } catch {
      setMessage("Meter status could not be updated.");
    }
  }

  return (
    <AppShell title="Meter Detail">
      <section className="page-header portfolio-detail-header">
        <div>
          <Breadcrumbs
            items={[{ href: "/meters", label: "Meters" }, { label: name }]}
          />
          <h2>{name}</h2>
          <p>{buildingName}</p>
        </div>
        <div className="portfolio-actions">
          <span className="status-pill">
            {archived ? "Archived meter" : "Active meter"}
          </span>
          {allowMutations ? (
            <button
              className="mode-button"
              onClick={() => setArchived(!archived)}
              type="button"
            >
              {archived ? "Restore meter" : "Archive meter"}
            </button>
          ) : null}
        </div>
      </section>
      {message ? <p className="form-error">{message}</p> : null}
      <section className="data-panel profile-panel">
        <div>
          <span>External ID</span>
          <strong>{meter.data.externalId}</strong>
        </div>
        <div>
          <span>Utility</span>
          <strong>{meter.data.utilityType}</strong>
        </div>
        <div>
          <span>Assignment</span>
          <strong>{unitName}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{meter.data.status}</strong>
        </div>
      </section>
    </AppShell>
  );
}
