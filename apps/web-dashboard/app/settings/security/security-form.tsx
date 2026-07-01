"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "../../../components/app-shell";
import { apiFetch } from "../../../lib/auth-client";

export function SecurityForm() {
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);

    try {
      const csrf = await apiFetch("/auth/csrf", { method: "GET" });
      const { csrfToken } = (await csrf.json()) as { csrfToken: string };
      const response = await apiFetch("/auth/change-password", {
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
        }),
        headers: {
          "x-csrf-token": csrfToken,
        },
        method: "POST",
      });
      setStatus(response.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell title="Security">
      <section className="page-header">
        <h2>Password</h2>
        <p>Update the password for your signed-in account</p>
      </section>
      <form className="data-panel settings-form" onSubmit={submit}>
        {status === "saved" ? (
          <p className="success-state">Password changed</p>
        ) : null}
        {status === "error" ? (
          <p className="form-error">Password could not be changed</p>
        ) : null}
        <label className="field">
          <span>Current password</span>
          <input name="currentPassword" type="password" />
        </label>
        <label className="field">
          <span>New password</span>
          <input name="newPassword" type="password" />
        </label>
        <button
          className="primary-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving" : "Change password"}
        </button>
      </form>
    </AppShell>
  );
}
