"use client";

import type { DashboardOperationItem } from "@iot-management/types";
import { useDashboardOperations } from "../../lib/dashboard-query";
import { formatDate } from "../incidents/incidents-panel";

export function OperationsToday() {
  const operations = useDashboardOperations();

  if (operations.isPending) {
    return <section className="state-panel">Loading operations</section>;
  }
  if (operations.isError && !operations.data) {
    return (
      <section className="state-panel error-state">
        Operations data is unavailable
      </section>
    );
  }

  const items = operations.data?.items ?? [];

  return (
    <section className="data-panel operations-queue">
      <div className="section-heading">
        <h2>Operations Today</h2>
        <span className="muted">{items.length} requiring attention</span>
      </div>
      {operations.isError ? (
        <p className="stale-note">
          Showing the most recently loaded operations data
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="muted">No operational follow-up is needed.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Priority work</th>
              <th>Status</th>
              <th>Assignment</th>
              <th>When</th>
              <th>Next action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.kind}:${item.id}`}>
                <td>
                  <strong>{item.title}</strong>
                  {item.supportingText ? (
                    <span>{item.supportingText}</span>
                  ) : null}
                </td>
                <td>
                  <span className={operationStatusClassName(item)}>
                    {operationStatusLabel(item)}
                  </span>
                </td>
                <td>{operationAssignmentLabel(item)}</td>
                <td>{operationWhenLabel(item)}</td>
                <td>
                  <a className="table-button" href={item.href}>
                    {item.actionLabel}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function operationAssignmentLabel(item: DashboardOperationItem): string {
  if (!item.assignmentType) return "-";
  return (
    {
      internal: "Internal",
      unassigned: "Unassigned",
      vendor: "Vendor",
    } as const
  )[item.assignmentType];
}

export function operationWhenLabel(item: DashboardOperationItem): string {
  if (item.dueAt) {
    return `${item.isOverdue ? "Overdue" : "Due"} ${formatDate(item.dueAt)}`;
  }
  if (item.detectedAt) {
    return `Detected ${formatDate(item.detectedAt)}`;
  }
  return "-";
}

function operationStatusClassName(item: DashboardOperationItem): string {
  if (item.isOverdue) return "status-pill severity-critical";
  if (item.severity) return `status-pill severity-${item.severity}`;
  return "status-pill";
}

function operationStatusLabel(item: DashboardOperationItem): string {
  if (item.isOverdue) return "Overdue";
  if (item.priority) return item.priority;
  if (item.severity) return item.severity;
  return item.status.replaceAll("_", " ");
}
