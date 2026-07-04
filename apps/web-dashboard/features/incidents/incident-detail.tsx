"use client";

import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  CreateWorkOrderRequest,
  LeakIncidentDetailResponse,
  LeakIncidentResponse,
  WorkOrder,
} from "@iot-management/types";
import { AppShell } from "../../components/app-shell";
import { Breadcrumbs } from "../../components/breadcrumbs";
import {
  canMutate,
  fetchJson,
  mutateJson,
  useCurrentSession,
} from "../../lib/use-api-resource";
import { formatDate } from "./incidents-panel";

const nextActions: Partial<
  Record<LeakIncidentDetailResponse["status"], { label: string; path: string }>
> = {
  acknowledged: { label: "Start investigation", path: "investigate" },
  contained: { label: "Start monitoring", path: "monitor" },
  investigating: { label: "Mark contained", path: "contain" },
  open: { label: "Acknowledge", path: "acknowledge" },
};

export function IncidentDetail({ incidentId }: { incidentId: string }) {
  const incident = useQuery({
    queryFn: () =>
      fetchJson<LeakIncidentDetailResponse>(`/incidents/${incidentId}`),
    queryKey: ["water-incident", incidentId],
    staleTime: 30_000,
  });
  const session = useCurrentSession();
  const [override, setOverride] = useState<LeakIncidentDetailResponse>();
  const [message, setMessage] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);

  if (incident.isPending || session.status === "loading") {
    return (
      <AppShell title="Water Incident">
        <section className="state-panel">Loading water incident</section>
      </AppShell>
    );
  }
  if ((incident.isError && !incident.data) || session.status === "error") {
    return (
      <AppShell title="Water Incident">
        <section className="state-panel error-state">
          Water incident data is unavailable
        </section>
      </AppShell>
    );
  }

  const data = override ?? incident.data!;
  const nextAction = nextActions[data.status];

  async function transition(path: string) {
    if (!allowMutations) return;
    setMessage("");
    try {
      const updated = await mutateJson<LeakIncidentResponse>(
        `/incidents/${incidentId}/${path}`,
        { method: "POST" },
      );
      setOverride({ ...data, ...updated });
    } catch {
      setMessage("Incident status could not be updated.");
    }
  }

  async function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowMutations) return;
    setMessage("");
    try {
      const updated = await mutateJson<LeakIncidentResponse>(
        `/incidents/${incidentId}/resolve`,
        {
          body: JSON.stringify({
            resolutionCategory: "leak_fixed",
            resolutionNote,
          }),
          method: "POST",
        },
      );
      setOverride({ ...data, ...updated });
      setResolutionNote("");
    } catch {
      setMessage("A resolution note is required to resolve this incident.");
    }
  }

  async function createWorkOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowMutations) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setMessage("");
    try {
      const workOrder = await mutateJson<WorkOrder>(
        `/incidents/${incidentId}/work-orders`,
        {
          body: JSON.stringify({
            description: String(values.get("description") ?? "").trim(),
            priority: String(
              values.get("priority") ?? "high",
            ) as CreateWorkOrderRequest["priority"],
            title: String(values.get("title") ?? "").trim(),
          } satisfies CreateWorkOrderRequest),
          method: "POST",
        },
      );
      setOverride({ ...data, workOrders: [...data.workOrders, workOrder] });
      form.reset();
    } catch {
      setMessage("Work order could not be created.");
    }
  }

  return (
    <AppShell title="Water Incident">
      <section className="page-header incident-header">
        <div>
          <Breadcrumbs
            items={[
              { href: "/incidents", label: "Incidents" },
              { label: data.title },
            ]}
          />
          <h2>{data.title}</h2>
          <p>{data.description}</p>
        </div>
        <div className="portfolio-actions">
          <span className={`status-pill severity-${data.severity}`}>
            {data.severity}
          </span>
          <span className="status-pill">{data.status}</span>
          {!allowMutations ? <span className="muted">Read only</span> : null}
          {allowMutations && nextAction ? (
            <button
              className="table-button"
              onClick={() => transition(nextAction.path)}
              type="button"
            >
              {nextAction.label}
            </button>
          ) : null}
        </div>
      </section>
      {incident.isError ? (
        <section className="state-panel stale-state">
          Showing the most recently loaded incident data
        </section>
      ) : null}
      {message ? (
        <section className="state-panel error-state">{message}</section>
      ) : null}
      <section className="detail-grid water-detail-grid">
        <article className="data-panel incident-context-panel">
          <h3>Incident context</h3>
          <dl className="detail-list">
            <div>
              <dt>Source</dt>
              <dd>{data.source.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Detected</dt>
              <dd>{formatDate(data.detectedAt)}</dd>
            </div>
            <div>
              <dt>Building</dt>
              <dd>{data.buildingId}</dd>
            </div>
            <div>
              <dt>Unit</dt>
              <dd>{data.unitId ?? "Building shared"}</dd>
            </div>
          </dl>
        </article>
        <article className="data-panel">
          <h3>Meter evidence</h3>
          {data.evidence.length === 0 ? (
            <p className="muted">No meter evidence attached.</p>
          ) : null}
          {data.evidence.map((evidence) => (
            <div className="evidence-row" key={evidence.id}>
              <strong>{evidence.observedUsage} observed</strong>
              <span>
                Threshold {evidence.thresholdUsage} ·{" "}
                {evidence.readingIds.length} readings
              </span>
              <span>
                {formatDate(evidence.windowStartedAt)} to{" "}
                {formatDate(evidence.windowEndedAt)}
              </span>
            </div>
          ))}
        </article>
        <article className="data-panel">
          <h3>Response timeline</h3>
          <ol className="incident-timeline">
            {data.activities.map((activity) => (
              <li key={activity.id}>
                <strong>{activity.summary}</strong>
                <span>{formatDate(activity.createdAt)}</span>
              </li>
            ))}
          </ol>
        </article>
        <article className="data-panel">
          <div className="section-heading">
            <h3>Repair history</h3>
          </div>
          {data.workOrders.length === 0 ? (
            <p className="muted">No repair work orders yet.</p>
          ) : null}
          {data.workOrders.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Work order</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {data.workOrders.map((workOrder) => (
                  <tr key={workOrder.id}>
                    <td>
                      {workOrder.title}
                      <span>{workOrder.description}</span>
                    </td>
                    <td>{workOrder.priority}</td>
                    <td>{workOrder.status}</td>
                    <td>{formatDate(workOrder.dueAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </article>
        {allowMutations && data.status !== "resolved" ? (
          <article className="data-panel">
            <h3>Create repair work order</h3>
            <form className="work-order-form" onSubmit={createWorkOrder}>
              <label className="field">
                <span>Work order title</span>
                <input name="title" required />
              </label>
              <label className="field">
                <span>Repair notes</span>
                <input name="description" required />
              </label>
              <label className="field">
                <span>Priority</span>
                <select defaultValue="high" name="priority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <button className="primary-button" type="submit">
                Create work order
              </button>
            </form>
          </article>
        ) : null}
        {allowMutations && data.status === "monitoring" ? (
          <article className="data-panel">
            <h3>Resolve incident</h3>
            <form className="work-order-form" onSubmit={resolve}>
              <label className="field">
                <span>Resolution note</span>
                <input
                  onChange={(event) => setResolutionNote(event.target.value)}
                  required
                  value={resolutionNote}
                />
              </label>
              <button className="primary-button" type="submit">
                Resolve incident
              </button>
            </form>
          </article>
        ) : null}
      </section>
    </AppShell>
  );
}
