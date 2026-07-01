"use client";

import { useState } from "react";
import { AppShell } from "../../../components/app-shell";
import { buildingName, meters, units } from "../../../lib/api";

export function BuildingDetail({ buildingId }: { buildingId: string }) {
  const [archived, setArchived] = useState(false);
  const name = buildingName(buildingId);
  const buildingUnits = units.filter((unit) => unit.buildingId === buildingId);
  const buildingMeters = meters.filter(
    (meter) => meter.buildingId === buildingId,
  );

  return (
    <AppShell title="Building Detail">
      <section className="page-header portfolio-detail-header">
        <div>
          <h2>{name}</h2>
          <p>Meter assignments and utility status</p>
        </div>
        <div className="portfolio-actions">
          <span className="status-pill">
            {archived ? "Archived building" : "Active building"}
          </span>
          <button
            className="mode-button"
            onClick={() => setArchived((current) => !current)}
            type="button"
          >
            {archived ? "Restore building" : "Archive building"}
          </button>
        </div>
      </section>

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
              {buildingUnits.map((unit) => (
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
              {buildingMeters.map((meter) => (
                <tr key={meter.id}>
                  <td>
                    <a href={`/meters/${meter.id}`}>{meter.label}</a>
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
