"use client";

import { useEffect, useState } from "react";
import type { AlertEvent, PageResponse } from "@iot-management/types";
import {
  canMutate,
  fetchJson,
  mutateJson,
  useCurrentSession,
} from "../../lib/use-api-resource";

export function AlertsTable() {
  const session = useCurrentSession();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [status, setStatus] = useState<"error" | "loading" | "ready">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    fetchJson<PageResponse<AlertEvent>>("/alerts")
      .then((response) => {
        if (!mounted) return;
        setAlerts(response.items);
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
                  <button
                    className="table-button"
                    type="button"
                    onClick={() => acknowledge(alert.id)}
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="muted">Reviewed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
