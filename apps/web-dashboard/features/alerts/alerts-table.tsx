"use client";

import { FormEvent, useEffect, useState } from "react";
import type {
  AlertEvent,
  AlertRule,
  PageResponse,
} from "@iot-management/types";
import {
  canMutate,
  fetchJson,
  mutateJson,
  useCurrentSession,
} from "../../lib/use-api-resource";

export function AlertsTable() {
  const session = useCurrentSession();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [status, setStatus] = useState<"error" | "loading" | "ready">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    Promise.all([
      fetchJson<PageResponse<AlertEvent>>("/alerts"),
      fetchJson<PageResponse<AlertRule>>("/alerts/rules"),
    ])
      .then(([alertResponse, ruleResponse]) => {
        if (!mounted) return;
        setAlerts(alertResponse.items);
        setRules(ruleResponse.items);
        setStatus("ready");
      })
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
      form.reset();
    } catch {
      setMessage("Alert rule could not be created.");
    }
  }

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
        {message ? <p className="form-error">{message}</p> : null}
        {alerts.length === 0 ? <p>No alerts found.</p> : null}
        <table>
          <thead>
            <tr>
              <th>Alert</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Triggered</th>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
