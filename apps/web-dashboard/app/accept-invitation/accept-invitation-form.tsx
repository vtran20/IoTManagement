"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { InvitationPreviewResponse } from "@iot-management/types";
import { apiFetch } from "../../lib/auth-client";

type LoadState = "loading" | "ready" | "error";
type SubmitState = "idle" | "accepted" | "error";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [preview, setPreview] =
    useState<InvitationPreviewResponse["invitation"]>();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadState("error");
      return;
    }
    let mounted = true;
    apiFetch(`/invitations/${encodeURIComponent(token)}`, { method: "GET" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Invitation unavailable");
        }
        const body = (await response.json()) as InvitationPreviewResponse;
        if (mounted) {
          setPreview(body.invitation);
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
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("idle");
    setIsSubmitting(true);
    const data = new FormData(event.currentTarget);

    try {
      const response = await apiFetch("/invitations/accept", {
        body: JSON.stringify({
          name: data.get("name"),
          password: data.get("password"),
          token,
        }),
        method: "POST",
      });
      setSubmitState(response.ok ? "accepted" : "error");
    } catch {
      setSubmitState("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-panel invitation-panel" onSubmit={submit}>
        <div className="brand-block">
          <div className="brand-mark">IU</div>
          <div>
            <strong>IoT Utilities</strong>
            <span>Smart buildings</span>
          </div>
        </div>
        <h1>Accept invitation</h1>
        {loadState === "loading" ? (
          <p className="empty-state">Loading invitation</p>
        ) : null}
        {loadState === "error" ? (
          <p className="form-error">Invitation is unavailable or expired.</p>
        ) : null}
        {loadState === "ready" && preview ? (
          <section className="invitation-summary" aria-label="Invitation">
            <span>{preview.organizationName}</span>
            <strong>{preview.email}</strong>
            <p>{preview.role} access</p>
          </section>
        ) : null}
        {submitState === "accepted" ? (
          <p className="success-state">Invitation accepted</p>
        ) : null}
        {submitState === "error" ? (
          <p className="form-error">Invitation could not be accepted.</p>
        ) : null}
        <label className="field">
          <span>Full name</span>
          <input name="name" required type="text" />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" required type="password" />
        </label>
        <button
          className="primary-button"
          disabled={isSubmitting || loadState !== "ready"}
          type="submit"
        >
          {isSubmitting ? "Accepting" : "Accept invitation"}
        </button>
        <Link className="text-link" href="/login">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}

export function AcceptInvitationForm() {
  return (
    <Suspense
      fallback={<main className="login-screen">Loading invitation</main>}
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
