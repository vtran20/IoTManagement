"use client";

import { useQuery } from "@tanstack/react-query";
import type { LeakIncident, PageResponse } from "@iot-management/types";
import { fetchJson } from "../../lib/use-api-resource";

export function IncidentsPanel() {
  const incidents = useQuery({
    queryFn: () => fetchJson<PageResponse<LeakIncident>>("/incidents"),
    queryKey: ["water-incidents"],
    staleTime: 30_000,
  });

  if (incidents.isPending) {
    return <section className="state-panel">Loading water incidents</section>;
  }
  if (incidents.isError && !incidents.data) {
    return (
      <section className="state-panel error-state">
        Water incident data is unavailable
      </section>
    );
  }
  const items = incidents.data?.items ?? [];
  if (items.length === 0) {
    return (
      <section className="state-panel">
        No water incidents need attention
      </section>
    );
  }

  return (
    <section className="data-panel">
      {incidents.isError ? (
        <p className="stale-note">
          Showing the most recently loaded incident data
        </p>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Incident</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Source</th>
            <th>Detected</th>
          </tr>
        </thead>
        <tbody>
          {items.map((incident) => (
            <tr key={incident.id}>
              <td>
                <a className="table-link" href={`/incidents/${incident.id}`}>
                  {incident.title}
                </a>
                <span>{incident.description}</span>
              </td>
              <td>
                <span className={`status-pill severity-${incident.severity}`}>
                  {incident.severity}
                </span>
              </td>
              <td>{incident.status}</td>
              <td>{incident.source.replaceAll("_", " ")}</td>
              <td>{formatDate(incident.detectedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function formatDate(value?: string): string {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";
}
