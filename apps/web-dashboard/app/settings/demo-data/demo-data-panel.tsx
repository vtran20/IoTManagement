"use client";

import { useState } from "react";
import type { DemoSeedResponse } from "@iot-management/types";
import { AppShell } from "../../../components/app-shell";
import {
  canMutate,
  mutateJson,
  useCurrentSession,
} from "../../../lib/use-api-resource";
import { useInvalidateDashboardOverview } from "../../../lib/dashboard-query";

export function DemoDataPanel() {
  const session = useCurrentSession();
  const invalidateDashboardOverview = useInvalidateDashboardOverview();
  const [result, setResult] = useState<DemoSeedResponse>();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allowMutations = canMutate(session.data?.membership.role);

  async function seedDemoData() {
    if (!allowMutations) return;
    setMessage("");
    setIsSubmitting(true);
    try {
      const response = await mutateJson<DemoSeedResponse>(
        "/simulations/demo-seed",
        { method: "POST" },
      );
      setResult(response);
      invalidateDashboardOverview();
      setMessage(`Demo data seeded for ${response.reportMonth}`);
    } catch {
      setMessage("Demo data could not be seeded.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell title="Demo Data">
      <section className="page-header">
        <h2>Demo Data</h2>
        <p>
          Seed deterministic utility data for local testing and product review.
        </p>
      </section>
      <section className="data-panel settings-links">
        <a className="mode-button" href="/settings">
          Settings
        </a>
        <a className="mode-button" href="/settings/rates">
          Utility Rates
        </a>
      </section>
      <section className="data-panel settings-form">
        {message ? (
          <p
            className={
              message.startsWith("Demo data seeded")
                ? "success-state"
                : "form-error"
            }
          >
            {message}
          </p>
        ) : null}
        {!allowMutations && session.status === "ready" ? (
          <p className="muted">Read only</p>
        ) : null}
        {allowMutations ? (
          <button
            className="primary-button"
            disabled={isSubmitting}
            onClick={seedDemoData}
            type="button"
          >
            {isSubmitting ? "Seeding" : "Seed demo data"}
          </button>
        ) : null}
        {result ? (
          <div className="profile-panel compact-profile">
            <div>
              <span>Buildings</span>
              <strong>{result.buildingCount}</strong>
            </div>
            <div>
              <span>Units</span>
              <strong>{result.unitCount}</strong>
            </div>
            <div>
              <span>Floors</span>
              <strong>{result.floorCount ?? "n/a"}</strong>
            </div>
            <div>
              <span>Meters</span>
              <strong>{result.meterCount}</strong>
            </div>
            <div>
              <span>Accepted readings</span>
              <strong>{result.acceptedReadingCount}</strong>
            </div>
            <div>
              <span>Alert rules</span>
              <strong>{result.alertRuleCount ?? "n/a"}</strong>
            </div>
            <div>
              <span>Alert events</span>
              <strong>{result.alertEventCount ?? "n/a"}</strong>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
