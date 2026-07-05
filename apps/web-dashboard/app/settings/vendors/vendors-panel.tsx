"use client";

import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PageResponse, Vendor } from "@iot-management/types";
import { AppShell } from "../../../components/app-shell";
import {
  canMutate,
  fetchJson,
  mutateJson,
  useCurrentSession,
} from "../../../lib/use-api-resource";

export function VendorsPanel() {
  const session = useCurrentSession();
  const vendors = useQuery({
    queryKey: ["vendors"],
    queryFn: () => fetchJson<PageResponse<Vendor>>("/vendors"),
  });
  const [message, setMessage] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowMutations) return;
    const form = new FormData(event.currentTarget);
    setMessage("");
    try {
      const optionalText = (name: string) => {
        const value = String(form.get(name) ?? "").trim();
        return value || undefined;
      };
      await mutateJson<Vendor>("/vendors", {
        method: "POST",
        body: JSON.stringify({
          companyName: String(form.get("companyName") ?? "").trim(),
          trade: String(form.get("trade") ?? "").trim(),
          contactName: optionalText("contactName"),
          phone: optionalText("phone"),
          email: optionalText("email"),
        }),
      });
      event.currentTarget.reset();
      await vendors.refetch();
    } catch {
      setMessage("Vendor could not be saved.");
    }
  }

  async function archive(vendor: Vendor) {
    try {
      await mutateJson<Vendor>(`/vendors/${vendor.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" }),
      });
      await vendors.refetch();
    } catch {
      setMessage("Vendor could not be archived.");
    }
  }

  return (
    <AppShell title="Vendors">
      <section className="page-header">
        <h2>Vendor directory</h2>
        <p>Organization-owned repair and service contacts.</p>
      </section>
      {vendors.isPending || session.status === "loading" ? (
        <section className="state-panel">Loading vendors</section>
      ) : null}
      {vendors.isError || session.status === "error" ? (
        <section className="state-panel error-state">
          Vendor data is unavailable
        </section>
      ) : null}
      {message ? <p className="form-error">{message}</p> : null}
      {allowMutations ? (
        <form className="data-panel compact-form" onSubmit={create}>
          <label className="field">
            <span>Company</span>
            <input name="companyName" required />
          </label>
          <label className="field">
            <span>Trade</span>
            <input name="trade" placeholder="Plumbing" required />
          </label>
          <label className="field">
            <span>Contact</span>
            <input name="contactName" />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" />
          </label>
          <button className="primary-button" type="submit">
            Add vendor
          </button>
        </form>
      ) : (
        <p className="stale-note">Read only</p>
      )}
      {vendors.data ? (
        <section className="data-panel">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Trade</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.data.items.length ? (
                vendors.data.items.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <strong>{vendor.companyName}</strong>
                      <span>
                        {vendor.email ?? vendor.phone ?? "No contact details"}
                      </span>
                    </td>
                    <td>{vendor.trade}</td>
                    <td>{vendor.contactName ?? "-"}</td>
                    <td>{vendor.status}</td>
                    <td>
                      {allowMutations && vendor.status === "active" ? (
                        <button
                          className="table-button"
                          onClick={() => archive(vendor)}
                          type="button"
                        >
                          Archive
                        </button>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No vendors yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ) : null}
    </AppShell>
  );
}
