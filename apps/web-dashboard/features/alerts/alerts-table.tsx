"use client";

import { FormEvent, useEffect, useState } from "react";
import type {
  AlertEvent,
  AlertEventResponse,
  AlertRule,
  Building,
  CreateIncidentFromAlertResponse,
  LeakIncident,
  PageResponse,
} from "@iot-management/types";
import {
  canMutate,
  fetchJson,
  mutateJson,
  useCurrentSession,
} from "../../lib/use-api-resource";
import { useInvalidateDashboardOverview } from "../../lib/dashboard-query";

export function AlertsTable() {
  const session = useCurrentSession();
  const invalidateDashboardOverview = useInvalidateDashboardOverview();
  const [alerts, setAlerts] = useState<AlertEventResponse[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [correlationMode, setCorrelationMode] = useState<
    "create" | "link" | undefined
  >();
  const [incidents, setIncidents] = useState<LeakIncident[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [status, setStatus] = useState<"error" | "loading" | "ready">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState<string>();
  const allowMutations = canMutate(session.data?.membership.role);

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    Promise.all([
      fetchJson<PageResponse<AlertEventResponse>>("/alerts"),
      fetchJson<PageResponse<AlertRule>>("/alerts/rules"),
      fetchJson<PageResponse<Building>>("/buildings"),
      fetchJson<PageResponse<LeakIncident>>("/incidents"),
    ])
      .then(
        ([alertResponse, ruleResponse, buildingResponse, incidentResponse]) => {
          if (!mounted) return;
          setAlerts(alertResponse.items);
          setBuildings(buildingResponse.items);
          setIncidents(incidentResponse.items);
          setRules(ruleResponse.items);
          setStatus("ready");
        },
      )
      .catch(() => {
        if (mounted) setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function acknowledge(alertId: string) {
    if (!allowMutations) return;
    setMessage("");
    try {
      const alert = await mutateJson<AlertEvent>(
        `/alerts/${alertId}/acknowledge`,
        { method: "POST" },
      );
      setAlerts((current) =>
        current.map((item) => (item.id === alertId ? alert : item)),
      );
      invalidateDashboardOverview();
    } catch {
      setMessage("Alert could not be acknowledged.");
    }
  }

  async function resolve(alertId: string) {
    if (!allowMutations) return;
    setMessage("");
    try {
      const alert = await mutateJson<AlertEvent>(`/alerts/${alertId}/resolve`, {
        method: "POST",
      });
      setAlerts((current) =>
        current.map((item) => (item.id === alertId ? alert : item)),
      );
      invalidateDashboardOverview();
    } catch {
      setMessage("Alert could not be resolved.");
    }
  }

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowMutations) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage("");
    try {
      const rule = await mutateJson<AlertRule>("/alerts/rules", {
        body: JSON.stringify({
          conditionType: "high_usage",
          name: String(data.get("name") ?? "").trim(),
          scopeType: "organization",
          threshold: Number(data.get("threshold")),
          utilityType: "water",
          windowMinutes: 60,
        }),
        method: "POST",
      });
      setRules((current) => [...current, rule]);
      invalidateDashboardOverview();
      form.reset();
    } catch {
      setMessage("Alert rule could not be created.");
    }
  }

  function openCorrelation(alertId: string, mode: "create" | "link") {
    setMessage("");
    setCorrelationMode(mode);
    setSelectedAlertId(alertId);
  }

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowMutations || !selectedAlertId) return;
    const values = new FormData(event.currentTarget);
    setMessage("");
    try {
      const response = await mutateJson<CreateIncidentFromAlertResponse>(
        `/alerts/${selectedAlertId}/incidents`,
        {
          body: JSON.stringify({
            buildingId: String(values.get("buildingId")),
            description: String(values.get("description")).trim(),
            severity: String(values.get("severity")),
            title: String(values.get("title")).trim(),
          }),
          method: "POST",
        },
      );
      setAlerts((current) =>
        current.map((alert) =>
          alert.id === selectedAlertId ? response.alert : alert,
        ),
      );
      invalidateDashboardOverview();
      window.location.assign(`/incidents/${response.incident.id}`);
    } catch {
      setMessage("Incident could not be created from this alert.");
    }
  }

  async function linkIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowMutations || !selectedAlertId) return;
    const values = new FormData(event.currentTarget);
    setMessage("");
    try {
      const alert = await mutateJson<AlertEventResponse>(
        `/alerts/${selectedAlertId}/link-incident`,
        {
          body: JSON.stringify({
            incidentId: String(values.get("incidentId")),
          }),
          method: "POST",
        },
      );
      setAlerts((current) =>
        current.map((item) => (item.id === selectedAlertId ? alert : item)),
      );
      setCorrelationMode(undefined);
      setSelectedAlertId(undefined);
      invalidateDashboardOverview();
    } catch {
      setMessage("Alert could not be linked to this incident.");
    }
  }

  const selectedAlert = alerts.find((alert) => alert.id === selectedAlertId);

  if (status === "loading" || session.status === "loading") {
    return <section className="state-panel">Loading alerts</section>;
  }

  if (status === "error" || session.status === "error") {
    return (
      <section className="state-panel error-state">
        Alert data is unavailable
      </section>
    );
  }

  return (
    <>
      <section className="data-panel alert-rules-panel">
        <div className="section-heading">
          <h2>Alert Rules</h2>
          {!allowMutations ? <span className="muted">Read only</span> : null}
        </div>
        {allowMutations ? (
          <form className="inline-form" onSubmit={createRule}>
            <label className="field">
              <span>Rule name</span>
              <input name="name" required type="text" />
            </label>
            <label className="field">
              <span>Threshold</span>
              <input name="threshold" required step="0.001" type="number" />
            </label>
            <button className="primary-button" type="submit">
              Create rule
            </button>
          </form>
        ) : null}
        {rules.length === 0 ? (
          <p className="muted">No alert rules found.</p>
        ) : null}
        {rules.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Utility</th>
                <th>Threshold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td>{rule.utilityType ?? "all"}</td>
                  <td>{rule.threshold ?? "-"}</td>
                  <td>{rule.enabled ? "enabled" : "disabled"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
      <div className="data-panel">
        {alerts.length === 0 ? <p>No alerts found.</p> : null}
        <table>
          <thead>
            <tr>
              <th>Alert</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Triggered</th>
              <th>Related incident</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td>
                  <strong>{alert.title}</strong>
                  <span>{alert.message}</span>
                </td>
                <td>{alert.severity}</td>
                <td>{alert.status}</td>
                <td>{new Date(alert.triggeredAt).toLocaleString("en-US")}</td>
                <td>
                  {alert.incident ? (
                    <a
                      className="table-link"
                      href={`/incidents/${alert.incident.id}`}
                    >
                      {alert.incident.title}
                    </a>
                  ) : (
                    <span className="muted">Unlinked</span>
                  )}
                </td>
                <td>
                  {alert.status === "open" && allowMutations ? (
                    <div className="table-actions">
                      <button
                        className="table-button"
                        type="button"
                        onClick={() => acknowledge(alert.id)}
                      >
                        Acknowledge
                      </button>
                      <button
                        className="mode-button"
                        type="button"
                        onClick={() => resolve(alert.id)}
                      >
                        Resolve
                      </button>
                    </div>
                  ) : (
                    <span className="muted">Reviewed</span>
                  )}
                  {!alert.incidentId && allowMutations ? (
                    <div className="table-actions">
                      <button
                        className="table-button"
                        onClick={() => openCorrelation(alert.id, "create")}
                        type="button"
                      >
                        Create incident
                      </button>
                      <button
                        className="mode-button"
                        onClick={() => openCorrelation(alert.id, "link")}
                        type="button"
                      >
                        Link existing incident
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {correlationMode && selectedAlert ? (
        <section className="data-panel">
          <div className="section-heading">
            <h2>
              {correlationMode === "create"
                ? "Create incident from alert"
                : "Link alert to incident"}
            </h2>
            <button
              className="mode-button"
              onClick={() => setCorrelationMode(undefined)}
              type="button"
            >
              Close
            </button>
          </div>
          {correlationMode === "create" ? (
            <form className="inline-form" onSubmit={createIncident}>
              <label className="field">
                <span>Building</span>
                <select name="buildingId" required>
                  <option value="">Select building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Severity</span>
                <select defaultValue={selectedAlert.severity} name="severity">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <label className="field">
                <span>Incident title</span>
                <input
                  defaultValue={selectedAlert.title}
                  name="title"
                  required
                />
              </label>
              <label className="field">
                <span>Incident details</span>
                <input
                  defaultValue={selectedAlert.message}
                  name="description"
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                Create incident
              </button>
            </form>
          ) : (
            <form className="inline-form" onSubmit={linkIncident}>
              <label className="field">
                <span>Incident</span>
                <select name="incidentId" required>
                  <option value="">Select active incident</option>
                  {incidents
                    .filter((incident) => incident.status !== "resolved")
                    .map((incident) => (
                      <option key={incident.id} value={incident.id}>
                        {incident.title}
                      </option>
                    ))}
                </select>
              </label>
              <button className="primary-button" type="submit">
                Link incident
              </button>
            </form>
          )}
        </section>
      ) : null}
      {message ? (
        <section className="state-panel error-state">{message}</section>
      ) : null}
    </>
  );
}
