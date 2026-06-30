"use client";

import { useState } from "react";
import { alerts as initialAlerts } from "../../lib/api";

export function AlertsTable() {
  const [alerts, setAlerts] = useState(initialAlerts);
  return (
    <div className="data-panel">
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
                {alert.status === "open" ? (
                  <button
                    className="table-button"
                    type="button"
                    onClick={() =>
                      setAlerts((current) =>
                        current.map((item) =>
                          item.id === alert.id
                            ? { ...item, status: "acknowledged" }
                            : item,
                        ),
                      )
                    }
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
