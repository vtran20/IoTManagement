"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/auth-client";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);

    try {
      const response = await apiFetch("/auth/reset-password", {
        body: JSON.stringify({
          newPassword: data.get("newPassword"),
          token: searchParams.get("token"),
        }),
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
    <main className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <div className="brand-block">
          <div className="brand-mark">IU</div>
          <div>
            <strong>IoT Utilities</strong>
            <span>Smart buildings</span>
          </div>
        </div>
        <h1>Choose password</h1>
        {status === "saved" ? (
          <p className="success-state">
            Password updated. You can sign in now.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="form-error">Reset link is invalid or expired.</p>
        ) : null}
        <label className="field">
          <span>New password</span>
          <input name="newPassword" type="password" />
        </label>
        <button
          className="primary-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Saving" : "Save password"}
        </button>
        <Link className="text-link" href="/login">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
