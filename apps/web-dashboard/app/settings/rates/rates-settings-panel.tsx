"use client";

import { FormEvent, useEffect, useState } from "react";
import type { UtilityRatesResponse } from "@iot-management/types";
import { AppShell } from "../../../components/app-shell";
import {
  canMutate,
  fetchJson,
  mutateJson,
  useCurrentSession,
} from "../../../lib/use-api-resource";
import { useInvalidateDashboardOverview } from "../../../lib/dashboard-query";

export function RatesSettingsPanel() {
  const session = useCurrentSession();
  const invalidateDashboardOverview = useInvalidateDashboardOverview();
  const [rates, setRates] = useState<UtilityRatesResponse>();
  const [waterRate, setWaterRate] = useState("");
  const [electricRate, setElectricRate] = useState("");
  const [status, setStatus] = useState<"error" | "loading" | "ready">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    fetchJson<UtilityRatesResponse>("/settings/rates")
      .then((response) => {
        if (!mounted) return;
        setRates(response);
        setWaterRate(String(response.waterPerGallon));
        setElectricRate(String(response.electricPerKwh));
        setStatus("ready");
      })
      .catch(() => {
        if (mounted) setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowMutations) return;
    setMessage("");
    try {
      const updated = await mutateJson<UtilityRatesResponse>(
        "/settings/rates",
        {
          body: JSON.stringify({
            electricPerKwh: Number(electricRate),
            waterPerGallon: Number(waterRate),
          }),
          method: "PATCH",
        },
      );
      setRates(updated);
      setWaterRate(String(updated.waterPerGallon));
      setElectricRate(String(updated.electricPerKwh));
      invalidateDashboardOverview();
      setMessage("Rates saved");
    } catch {
      setMessage("Rates could not be saved.");
    }
  }

  return (
    <AppShell title="Utility Rates">
      <section className="page-header">
        <h2>Rate Configuration</h2>
        <p>Water and electric cost assumptions for reports and dashboards.</p>
      </section>
      <section className="data-panel settings-links">
        <a className="mode-button" href="/settings">
          Settings
        </a>
        <a className="mode-button" href="/settings/demo-data">
          Demo Data
        </a>
      </section>
      {status === "loading" || session.status === "loading" ? (
        <section className="state-panel">Loading rates</section>
      ) : null}
      {status === "error" || session.status === "error" ? (
        <section className="state-panel error-state">
          Rate settings are unavailable
        </section>
      ) : null}
      {status === "ready" && session.status === "ready" ? (
        <form className="data-panel settings-form" onSubmit={submit}>
          {message ? (
            <p
              className={
                message === "Rates saved" ? "success-state" : "form-error"
              }
            >
              {message}
            </p>
          ) : null}
          {!allowMutations ? <p className="muted">Read only</p> : null}
          <label className="field">
            <span>Water rate</span>
            <input
              name="waterRate"
              onChange={(event) => setWaterRate(event.target.value)}
              readOnly={!allowMutations}
              step="0.001"
              type="number"
              value={waterRate}
            />
          </label>
          <label className="field">
            <span>Electric rate</span>
            <input
              name="electricRate"
              onChange={(event) => setElectricRate(event.target.value)}
              readOnly={!allowMutations}
              step="0.001"
              type="number"
              value={electricRate}
            />
          </label>
          <div className="profile-panel compact-profile">
            <div>
              <span>Organization</span>
              <strong>{rates?.organizationId}</strong>
            </div>
            <div>
              <span>Last updated</span>
              <strong>{rates?.updatedAt ?? "Defaults"}</strong>
            </div>
          </div>
          {allowMutations ? (
            <button className="primary-button" type="submit">
              Save rates
            </button>
          ) : null}
        </form>
      ) : null}
    </AppShell>
  );
}
