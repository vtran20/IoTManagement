"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "../../components/app-shell";

export function SettingsForm() {
  const [saved, setSaved] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }

  return (
    <AppShell title="Settings">
      <section className="page-header">
        <h2>Rates</h2>
        <p>Organization rates</p>
      </section>
      <form className="data-panel settings-form" onSubmit={submit}>
        {saved ? <p className="success-state">Settings saved</p> : null}
        <label className="field">
          <span>Water rate</span>
          <input
            name="waterRate"
            type="number"
            step="0.001"
            defaultValue="0.005"
          />
        </label>
        <label className="field">
          <span>Electric rate</span>
          <input
            name="electricRate"
            type="number"
            step="0.001"
            defaultValue="0.150"
          />
        </label>
        <button className="primary-button" type="submit">
          Save settings
        </button>
      </form>
    </AppShell>
  );
}
