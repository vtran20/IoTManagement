"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Membership, UserRole } from "@iot-management/types";
import { AppShell } from "../../../components/app-shell";
import { apiFetch } from "../../../lib/auth-client";
import { useCurrentSession } from "../../../lib/use-api-resource";

type LoadState = "loading" | "ready" | "error";
type SubmitState = "idle" | "sent" | "error";

export function UsersPanel() {
  const session = useCurrentSession();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const role = session.data?.membership.role;
  const canManageUsers = role === "owner" || role === "manager";
  const inviteRoles: UserRole[] =
    role === "owner" ? ["viewer", "manager", "owner"] : ["viewer"];

  useEffect(() => {
    if (!canManageUsers) {
      return;
    }
    let mounted = true;
    apiFetch("/memberships")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load memberships");
        }
        const body = (await response.json()) as { items: Membership[] };
        if (mounted) {
          setMemberships(body.items);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadState("error");
        }
      });
    return () => {
      mounted = false;
    };
  }, [canManageUsers]);

  if (session.status === "loading") {
    return (
      <AppShell title="Users">
        <section className="state-panel">Loading access controls</section>
      </AppShell>
    );
  }

  if (session.status === "error" || !canManageUsers) {
    return (
      <AppShell title="Users">
        <section className="state-panel error-state">
          User management requires owner or manager access.
        </section>
      </AppShell>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitState("idle");
    setIsSubmitting(true);
    const data = new FormData(form);

    try {
      const csrf = await apiFetch("/auth/csrf", { method: "GET" });
      const { csrfToken } = (await csrf.json()) as { csrfToken: string };
      const response = await apiFetch("/invitations", {
        body: JSON.stringify({
          email: data.get("email"),
          role: data.get("role"),
        }),
        headers: {
          "x-csrf-token": csrfToken,
        },
        method: "POST",
      });
      setSubmitState(response.ok ? "sent" : "error");
      if (response.ok) {
        form.reset();
      }
    } catch {
      setSubmitState("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell title="Users">
      <section className="page-header">
        <h2>Access</h2>
        <p>Invite users and review current organization memberships</p>
      </section>

      <form className="data-panel users-invite-form" onSubmit={submit}>
        <label className="field">
          <span>Invite email</span>
          <input name="email" required type="email" />
        </label>
        <label className="field compact-field">
          <span>Invite role</span>
          <select name="role" defaultValue="viewer">
            {inviteRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <button
          className="primary-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Sending" : "Send invitation"}
        </button>
        {submitState === "sent" ? (
          <p className="success-state">Invitation sent</p>
        ) : null}
        {submitState === "error" ? (
          <p className="form-error">Invitation could not be sent</p>
        ) : null}
      </form>

      <section className="data-panel table-card users-table-panel">
        <header className="panel-heading">
          <h3>Memberships</h3>
          <span>{memberships.length} users</span>
        </header>
        {loadState === "loading" ? (
          <p className="empty-state">Loading users</p>
        ) : null}
        {loadState === "error" ? (
          <p className="form-error">Users are unavailable</p>
        ) : null}
        {loadState === "ready" && memberships.length === 0 ? (
          <p className="empty-state">No users yet</p>
        ) : null}
        {loadState === "ready" && memberships.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Membership</th>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((membership) => (
                <tr key={membership.id}>
                  <td>{membership.id}</td>
                  <td>{membership.userId}</td>
                  <td>{membership.role}</td>
                  <td>{membership.status ?? "active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </AppShell>
  );
}
