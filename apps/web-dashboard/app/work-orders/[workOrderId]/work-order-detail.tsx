"use client";

import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  Membership,
  PageResponse,
  Vendor,
  WorkOrderNote,
  WorkOrderResponse,
} from "@iot-management/types";
import { AppShell } from "../../../components/app-shell";
import {
  canMutate,
  fetchJson,
  mutateJson,
  useCurrentSession,
} from "../../../lib/use-api-resource";
import { formatDate } from "../../../features/incidents/incidents-panel";

export function WorkOrderDetail({ workOrderId }: { workOrderId: string }) {
  const session = useCurrentSession();
  const workOrder = useQuery({
    queryKey: ["work-order", workOrderId],
    queryFn: () => fetchJson<WorkOrderResponse>(`/work-orders/${workOrderId}`),
  });
  const notes = useQuery({
    queryKey: ["work-order-notes", workOrderId],
    queryFn: () =>
      fetchJson<PageResponse<WorkOrderNote>>(
        `/work-orders/${workOrderId}/notes`,
      ),
  });
  const vendors = useQuery({
    queryKey: ["vendors"],
    queryFn: () => fetchJson<PageResponse<Vendor>>("/vendors"),
  });
  const memberships = useQuery({
    queryKey: ["memberships"],
    queryFn: () => fetchJson<PageResponse<Membership>>("/memberships"),
  });
  const [message, setMessage] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);
  const item = workOrder.data;

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const note = String(form.get("note") ?? "").trim();
    if (!note) return;
    try {
      await mutateJson<WorkOrderNote>(`/work-orders/${workOrderId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      event.currentTarget.reset();
      await notes.refetch();
    } catch {
      setMessage("Note could not be added.");
    }
  }

  async function saveOperations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assignment = String(form.get("assignment") ?? "");
    const dueAt = String(form.get("dueAt") ?? "");
    const estimatedCost = String(form.get("estimatedCost") ?? "");
    const body: Record<string, unknown> = {};
    if (assignment.startsWith("vendor:")) {
      body.assignedVendorId = assignment.slice(7);
    }
    if (assignment.startsWith("member:")) {
      body.assignedMembershipId = assignment.slice(7);
    }
    if (dueAt) body.dueAt = new Date(dueAt).toISOString();
    if (estimatedCost) body.estimatedCost = Number(estimatedCost);
    try {
      await mutateJson<WorkOrderResponse>(`/work-orders/${workOrderId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await workOrder.refetch();
      setMessage("Work order updated.");
    } catch {
      setMessage("Work order could not be updated.");
    }
  }
  if (workOrder.isPending || session.status === "loading")
    return (
      <AppShell title="Work Order">
        <section className="state-panel">Loading work order</section>
      </AppShell>
    );
  if (!item || workOrder.isError || session.status === "error")
    return (
      <AppShell title="Work Order">
        <section className="state-panel error-state">
          Work order is unavailable
        </section>
      </AppShell>
    );
  return (
    <AppShell title="Work Order">
      <section className="breadcrumbs">
        <a href="/work-orders">Work Orders</a>
        <span aria-current="page">{item.title}</span>
      </section>
      <section className="page-header">
        <h2>{item.title}</h2>
        <p>{item.description}</p>
      </section>
      {message ? <p className="form-error">{message}</p> : null}
      <section className="data-panel detail-grid work-order-summary">
        <div>
          <span className="muted">Status</span>
          <strong>{item.status}</strong>
        </div>
        <div>
          <span className="muted">Priority</span>
          <strong>{item.priority}</strong>
        </div>
        <div>
          <span className="muted">Due</span>
          <strong>{formatDate(item.dueAt)}</strong>
        </div>
        <div>
          <span className="muted">Assignment</span>
          <strong>
            {item.assignedVendorId
              ? `Vendor: ${item.assignedVendorId}`
              : item.assignedMembershipId
                ? `Internal: ${item.assignedMembershipId}`
                : "Unassigned"}
          </strong>
        </div>
        <div>
          <span className="muted">Estimated cost</span>
          <strong>
            {item.estimatedCost === undefined
              ? "-"
              : `$${item.estimatedCost.toFixed(2)}`}
          </strong>
        </div>
        <div>
          <span className="muted">Final cost</span>
          <strong>
            {item.finalCost === undefined
              ? "-"
              : `$${item.finalCost.toFixed(2)}`}
          </strong>
        </div>
      </section>
      {allowMutations && !["completed", "cancelled"].includes(item.status) ? (
        <form className="data-panel compact-form" onSubmit={saveOperations}>
          <div className="section-heading">
            <h2>Assignment and schedule</h2>
          </div>
          <label className="field">
            <span>Assignee</span>
            <select
              defaultValue={
                item.assignedVendorId
                  ? `vendor:${item.assignedVendorId}`
                  : item.assignedMembershipId
                    ? `member:${item.assignedMembershipId}`
                    : ""
              }
              name="assignment"
            >
              <option value="">Keep current assignment</option>
              {memberships.data?.items
                .filter(
                  (membership) =>
                    membership.status === "active" &&
                    (membership.role === "owner" ||
                      membership.role === "manager"),
                )
                .map((membership) => (
                  <option key={membership.id} value={`member:${membership.id}`}>
                    Internal: {membership.id}
                  </option>
                ))}
              {vendors.data?.items
                .filter((vendor) => vendor.status === "active")
                .map((vendor) => (
                  <option key={vendor.id} value={`vendor:${vendor.id}`}>
                    Vendor: {vendor.companyName}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span>Due date</span>
            <input
              defaultValue={
                item.dueAt
                  ? new Date(item.dueAt).toISOString().slice(0, 16)
                  : ""
              }
              name="dueAt"
              type="datetime-local"
            />
          </label>
          <label className="field">
            <span>Estimated cost</span>
            <input
              defaultValue={item.estimatedCost ?? ""}
              min="0"
              name="estimatedCost"
              step="0.01"
              type="number"
            />
          </label>
          <button className="primary-button" type="submit">
            Save operations
          </button>
        </form>
      ) : null}
      <section className="data-panel">
        <div className="section-heading">
          <h2>Work notes</h2>
          {!allowMutations ? <span className="muted">Read only</span> : null}
        </div>
        {allowMutations ? (
          <form className="compact-form" onSubmit={addNote}>
            <label className="field">
              <span>Note</span>
              <textarea name="note" required />
            </label>
            <button className="primary-button" type="submit">
              Add note
            </button>
          </form>
        ) : null}
        <div className="activity-list">
          {notes.data?.items.length ? (
            notes.data.items.map((note) => (
              <article key={note.id}>
                <strong>{formatDate(note.createdAt)}</strong>
                <p>{note.note}</p>
              </article>
            ))
          ) : (
            <p className="muted">No work-order notes yet</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
