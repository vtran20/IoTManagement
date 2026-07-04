"use client";

import { useState } from "react";
import type {
  Building,
  BuildingDetailResponse,
  Meter,
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

export function BuildingDetail({ buildingId }: { buildingId: string }) {
  const detail = useApiResource<BuildingDetailResponse>(
    `/buildings/${buildingId}`,
  );
  const session = useCurrentSession();
  const [lifecycleStatus, setLifecycleStatus] =
    useState<Building["lifecycleStatus"]>();
  const [message, setMessage] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);

  if (detail.status === "loading" || session.status === "loading") {
    return (
      <AppShell title="Building Detail">
        <section className="state-panel">Loading building</section>
      </AppShell>
    );
  }

  if (detail.status === "error" || session.status === "error") {
    return (
      <AppShell title="Building Detail">
        <section className="state-panel error-state">
          Building data is unavailable
        </section>
      </AppShell>
    );
  }

  const building = normalizeBuilding(detail.data);
  const archived = (lifecycleStatus ?? building.lifecycleStatus) === "archived";

  async function setArchived(nextArchived: boolean) {
    if (!allowMutations) return;
    setMessage("");
    try {
      const updated = await mutateJson<Building>(
        `/buildings/${buildingId}/${nextArchived ? "archive" : "restore"}`,
        { method: "POST" },
      );
      setLifecycleStatus(updated.lifecycleStatus ?? "active");
    } catch {
      setMessage("Building status could not be updated.");
    }
  }

  return (
    <AppShell title="Building Detail">
      <section className="page-header portfolio-detail-header">
        <div>
          <Breadcrumbs
            items={[
              { href: "/buildings", label: "Buildings" },
              { label: building.name },
            ]}
          />
          <h2>{building.name}</h2>
          <p>Meter assignments and utility status</p>
        </div>
        <div className="portfolio-actions">
          <span className="status-pill">
            {archived ? "Archived building" : "Active building"}
          </span>
          {allowMutations ? (
            <button
              className="mode-button"
              onClick={() => setArchived(!archived)}
              type="button"
            >
              {archived ? "Restore building" : "Archive building"}
            </button>
          ) : null}
        </div>
      </section>
      {message ? <p className="form-error">{message}</p> : null}

      <div className="data-panel detail-grid">
        <section>
          <h3>Related units</h3>
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.data.units.map((unit) => (
                <tr key={unit.id}>
                  <td>
                    <a href={`/units/${unit.id}`}>{unit.name}</a>
                  </td>
                  <td>{unit.occupancyStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h3>Related meters</h3>
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
              {detail.data.meters.map((meter) => (
                <tr key={meter.id}>
                  <td>
                    <a href={`/meters/${meter.id}`}>{meterLabel(meter)}</a>
                  </td>
                  <td>{meter.externalId}</td>
                  <td>{meter.utilityType}</td>
                  <td>{meter.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}

function normalizeBuilding(detail: BuildingDetailResponse): Building {
  return detail.building ?? detail;
}

function meterLabel(meter: Meter & { label?: string }): string {
  return meter.label ?? meter.externalId;
}
