"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);

    try {
      const response = await apiFetch("/auth/login", {
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
        method: "POST",
      });

      if (!response.ok) {
        setError("Invalid email or password");
        return;
      }

      router.push(searchParams.get("next") ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Sign in is unavailable. Try again soon.");
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
        <h1>Sign in</h1>
        {error ? <p className="form-error">{error}</p> : null}
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" defaultValue="owner@north.example" />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" defaultValue="password123" />
        </label>
        <button
          className="primary-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing in" : "Sign in"}
        </button>
        <a className="text-link" href="/forgot-password">
          Forgot password
        </a>
      </form>
    </main>
  );
}
