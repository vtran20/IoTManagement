"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  OperationsNotification,
  PageResponse,
  WorkOrderNotification,
  WorkOrderResponse,
} from "@iot-management/types";
import {
  canMutate,
  fetchJson,
  mutateJson,
  useCurrentSession,
} from "../../lib/use-api-resource";
import { formatDate } from "../incidents/incidents-panel";

export function WorkOrdersPanel() {
  const workOrders = useQuery({
    queryFn: () => fetchJson<PageResponse<WorkOrderResponse>>("/work-orders"),
    queryKey: ["repair-work-orders"],
    staleTime: 30_000,
  });
  const session = useCurrentSession();
  const notifications = useQuery({
    queryFn: () =>
      fetchJson<PageResponse<OperationsNotification>>("/notifications"),
    queryKey: ["operations-notifications"],
    staleTime: 30_000,
  });
  const [overrides, setOverrides] = useState<Record<string, WorkOrderResponse>>(
    {},
  );
  const [completionNotes, setCompletionNotes] = useState<
    Record<string, string>
  >({});
  const [finalCosts, setFinalCosts] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [message, setMessage] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);

  if (workOrders.isPending || session.status === "loading") {
    return (
      <section className="state-panel">Loading repair work orders</section>
    );
  }
  if ((workOrders.isError && !workOrders.data) || session.status === "error") {
    return (
      <section className="state-panel error-state">
        Repair work-order data is unavailable
      </section>
    );
  }
  const items = (workOrders.data?.items ?? [])
    .map((item) => overrides[item.id] ?? item)
    .filter(
      (item) =>
        (statusFilter === "all" || item.status === statusFilter) &&
        (priorityFilter === "all" || item.priority === priorityFilter) &&
        (assignmentFilter === "all" ||
          (assignmentFilter === "vendor" && !!item.assignedVendorId) ||
          (assignmentFilter === "internal" && !!item.assignedMembershipId) ||
          (assignmentFilter === "unassigned" &&
            !item.assignedVendorId &&
            !item.assignedMembershipId)) &&
        (!overdueOnly || item.isOverdue),
    );
  if (items.length === 0) {
    return (
      <section className="state-panel">No repair work orders are open</section>
    );
  }

  async function startWork(workOrderId: string) {
    if (!allowMutations) return;
    setMessage("");
    try {
      const updated = await mutateJson<WorkOrderResponse>(
        `/work-orders/${workOrderId}`,
        { body: JSON.stringify({ status: "in_progress" }), method: "PATCH" },
      );
      setOverrides((current) => ({ ...current, [workOrderId]: updated }));
    } catch {
      setMessage("Work order could not be started.");
    }
  }

  async function markNotificationRead(notificationId: string) {
    try {
      await mutateJson<OperationsNotification>(
        `/notifications/${notificationId}/read`,
        { method: "POST" },
      );
      await notifications.refetch();
    } catch {
      setMessage("Notification could not be marked as read.");
    }
  }

  async function completeWork(workOrderId: string) {
    if (!allowMutations) return;
    const completionNote = completionNotes[workOrderId]?.trim();
    const finalCostText = finalCosts[workOrderId]?.trim();
    const finalCost = Number(finalCostText);
    if (
      !completionNote ||
      !finalCostText ||
      !Number.isFinite(finalCost) ||
      finalCost < 0
    ) {
      setMessage("A completion note and non-negative final cost are required.");
      return;
    }
    setMessage("");
    try {
      const updated = await mutateJson<WorkOrderResponse>(
        `/work-orders/${workOrderId}`,
        {
          body: JSON.stringify({
            completionNote,
            finalCost,
            status: "completed",
          }),
          method: "PATCH",
        },
      );
      setOverrides((current) => ({ ...current, [workOrderId]: updated }));
    } catch {
      setMessage("Work order could not be completed.");
    }
  }

  const overdueNotifications = (notifications.data?.items ?? []).filter(
    isUnreadWorkOrderNotification,
  );

  return (
    <>
      {overdueNotifications.length ? (
        <section className="data-panel">
          <div className="section-heading">
            <h2>Overdue work</h2>
          </div>
          {overdueNotifications.map((notification) => (
            <div className="alert-actions" key={notification.id}>
              <a
                className="text-link"
                href={`/work-orders/${notification.workOrderId}`}
              >
                View overdue work order
              </a>
              <button
                className="secondary-button"
                onClick={() => markNotificationRead(notification.id)}
                type="button"
              >
                Mark read
              </button>
            </div>
          ))}
        </section>
      ) : null}
      <section className="data-panel">
        <div className="section-heading">
          <h2>Repair queue</h2>
          {!allowMutations ? <span className="muted">Read only</span> : null}
        </div>
        <div className="filter-row">
          <select
            aria-label="Filter by status"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            aria-label="Filter by priority"
            onChange={(event) => setPriorityFilter(event.target.value)}
            value={priorityFilter}
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select
            aria-label="Filter by assignment"
            onChange={(event) => setAssignmentFilter(event.target.value)}
            value={assignmentFilter}
          >
            <option value="all">All assignments</option>
            <option value="internal">Internal</option>
            <option value="vendor">Vendor</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <label className="checkbox-field">
            <input
              checked={overdueOnly}
              onChange={(event) => setOverdueOnly(event.target.checked)}
              type="checkbox"
            />{" "}
            Overdue only
          </label>
        </div>
        {workOrders.isError ? (
          <p className="stale-note">
            Showing the most recently loaded work orders
          </p>
        ) : null}
        {message ? <p className="form-error">{message}</p> : null}
        <table>
          <thead>
            <tr>
              <th>Work order</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assignment</th>
              <th>Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((workOrder) => (
              <tr key={workOrder.id}>
                <td>
                  <a
                    className="text-link"
                    href={`/work-orders/${workOrder.id}`}
                  >
                    {workOrder.title}
                  </a>
                  <span>{workOrder.description}</span>
                </td>
                <td>{workOrder.priority}</td>
                <td>{workOrder.status}</td>
                <td>
                  {workOrder.assignedVendorId
                    ? "Vendor"
                    : workOrder.assignedMembershipId
                      ? "Internal"
                      : "Unassigned"}
                </td>
                <td>{formatDate(workOrder.dueAt)}</td>
                <td>
                  {allowMutations && workOrder.status === "assigned" ? (
                    <button
                      className="table-button"
                      onClick={() => startWork(workOrder.id)}
                      type="button"
                    >
                      Start work
                    </button>
                  ) : allowMutations && workOrder.status === "in_progress" ? (
                    <div className="completion-action">
                      <input
                        aria-label="Completion note"
                        onChange={(event) =>
                          setCompletionNotes((current) => ({
                            ...current,
                            [workOrder.id]: event.target.value,
                          }))
                        }
                        placeholder="Completion note"
                        value={completionNotes[workOrder.id] ?? ""}
                      />
                      <input
                        aria-label="Final cost"
                        min="0"
                        onChange={(event) =>
                          setFinalCosts((current) => ({
                            ...current,
                            [workOrder.id]: event.target.value,
                          }))
                        }
                        placeholder="Final cost"
                        step="0.01"
                        type="number"
                        value={finalCosts[workOrder.id] ?? ""}
                      />
                      <button
                        className="table-button"
                        onClick={() => completeWork(workOrder.id)}
                        type="button"
                      >
                        Complete work
                      </button>
                    </div>
                  ) : (
                    <span className="muted">
                      {workOrder.status === "completed"
                        ? "Completed"
                        : "No action"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function isUnreadWorkOrderNotification(
  notification: OperationsNotification,
): notification is WorkOrderNotification {
  return notification.kind === "work_order_overdue" && !notification.readAt;
}
