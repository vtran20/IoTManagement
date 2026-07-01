"use client";

import { useState } from "react";
import { AppShell } from "../../../components/app-shell";
import { buildingName, meters, unitName } from "../../../lib/api";

export function MeterDetail({ meterId }: { meterId: string }) {
  const [archived, setArchived] = useState(false);
  const meter = meters.find((candidate) => candidate.id === meterId);
  const name = meter?.label ?? meterId;

  return (
    <AppShell title="Meter Detail">
      <section className="page-header portfolio-detail-header">
        <div>
          <h2>{name}</h2>
          <p>{meter ? buildingName(meter.buildingId) : "Unknown building"}</p>
        </div>
        <div className="portfolio-actions">
          <span className="status-pill">
            {archived ? "Archived meter" : "Active meter"}
          </span>
          <button
            className="mode-button"
            onClick={() => setArchived((current) => !current)}
            type="button"
          >
            {archived ? "Restore meter" : "Archive meter"}
          </button>
        </div>
      </section>
      <section className="data-panel profile-panel">
        <div>
          <span>External ID</span>
          <strong>{meter?.externalId ?? meterId}</strong>
        </div>
        <div>
          <span>Utility</span>
          <strong>{meter?.utilityType ?? "unknown"}</strong>
        </div>
        <div>
          <span>Assignment</span>
          <strong>{meter ? unitName(meter.unitId) : "Unknown"}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{meter?.status ?? "unknown"}</strong>
        </div>
      </section>
    </AppShell>
  );
}
