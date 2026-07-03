"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PageResponse, WorkOrderResponse } from "@iot-management/types";
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
  const [overrides, setOverrides] = useState<Record<string, WorkOrderResponse>>(
    {},
  );
  const [completionNotes, setCompletionNotes] = useState<
    Record<string, string>
  >({});
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
  const items = (workOrders.data?.items ?? []).map(
    (item) => overrides[item.id] ?? item,
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

  async function completeWork(workOrderId: string) {
    if (!allowMutations) return;
    const completionNote = completionNotes[workOrderId]?.trim();
    if (!completionNote) {
      setMessage("A completion note is required before completing work.");
      return;
    }
    setMessage("");
    try {
      const updated = await mutateJson<WorkOrderResponse>(
        `/work-orders/${workOrderId}`,
        {
          body: JSON.stringify({ completionNote, status: "completed" }),
          method: "PATCH",
        },
      );
      setOverrides((current) => ({ ...current, [workOrderId]: updated }));
    } catch {
      setMessage("Work order could not be completed.");
    }
  }

  return (
    <section className="data-panel">
      <div className="section-heading">
        <h2>Repair queue</h2>
        {!allowMutations ? <span className="muted">Read only</span> : null}
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
            <th>Due</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((workOrder) => (
            <tr key={workOrder.id}>
              <td>
                <strong>{workOrder.title}</strong>
                <span>{workOrder.description}</span>
              </td>
              <td>{workOrder.priority}</td>
              <td>{workOrder.status}</td>
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
  );
}
