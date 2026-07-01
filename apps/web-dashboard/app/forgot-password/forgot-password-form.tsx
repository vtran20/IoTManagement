"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/auth-client";
import { demoUser } from "../../lib/api";

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);

    try {
      await apiFetch("/auth/forgot-password", {
        body: JSON.stringify({ email: data.get("email") }),
        method: "POST",
      });
      setStatus("sent");
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
        <h1>Reset password</h1>
        {status === "sent" ? (
          <p className="success-state">
            If an account exists, a reset link has been sent.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="form-error">Password reset is unavailable.</p>
        ) : null}
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" defaultValue={demoUser.email} />
        </label>
        <button
          className="primary-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Sending" : "Send reset link"}
        </button>
        <Link className="text-link" href="/login">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
