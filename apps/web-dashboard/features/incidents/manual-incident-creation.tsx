"use client";

import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  AlertSeverity,
  Building,
  CreateManualLeakIncidentRequest,
  LeakIncident,
  Meter,
  PageResponse,
  Unit,
} from "@iot-management/types";
import {
  canMutate,
  fetchJson,
  mutateJson,
  useCurrentSession,
} from "../../lib/use-api-resource";

const severities: AlertSeverity[] = ["info", "warning", "critical"];

export function ManualIncidentCreation() {
  const session = useCurrentSession();
  const [isOpen, setIsOpen] = useState(false);
  const [buildingId, setBuildingId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [meterId, setMeterId] = useState("");
  const [message, setMessage] = useState("");
  const allowMutations = canMutate(session.data?.membership.role);
  const context = useQuery({
    enabled: allowMutations && isOpen,
    queryFn: async () => {
      const [buildings, units, meters] = await Promise.all([
        fetchJson<PageResponse<Building>>("/buildings"),
        fetchJson<PageResponse<Unit>>("/units"),
        fetchJson<PageResponse<Meter>>("/meters"),
      ]);
      return {
        buildings: buildings.items,
        meters: meters.items,
        units: units.items,
      };
    },
    queryKey: ["manual-incident-context"],
    staleTime: 30_000,
  });

  const units = useMemo(
    () =>
      context.data?.units.filter((unit) => unit.buildingId === buildingId) ??
      [],
    [buildingId, context.data?.units],
  );
  const meters = useMemo(
    () =>
      context.data?.meters.filter((meter) => meter.buildingId === buildingId) ??
      [],
    [buildingId, context.data?.meters],
  );

  if (session.status !== "ready" || !allowMutations) {
    return null;
  }

  function close() {
    setBuildingId("");
    setMeterId("");
    setIsOpen(false);
    setMessage("");
    setUnitId("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload: CreateManualLeakIncidentRequest = {
      buildingId: String(data.get("buildingId")),
      description: String(data.get("description")).trim(),
      severity: String(data.get("severity")) as AlertSeverity,
      title: String(data.get("title")).trim(),
      ...(meterId ? { meterId } : {}),
      ...(unitId ? { unitId } : {}),
    };

    setMessage("");
    try {
      const incident = await mutateJson<LeakIncident>("/incidents/manual", {
        body: JSON.stringify(payload),
        method: "POST",
      });
      window.location.assign(`/incidents/${incident.id}`);
    } catch {
      setMessage(
        "Incident could not be created. Check the report details and try again.",
      );
    }
  }

  return (
    <>
      <section className="incident-create-action">
        <button
          aria-expanded={isOpen}
          className="primary-button"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          Create incident
        </button>
      </section>
      {isOpen ? (
        <section className="data-panel incident-creation-panel">
          <div className="section-heading">
            <div>
              <h2>Create water incident</h2>
              <p className="muted">
                Record a report that is not tied to an alert.
              </p>
            </div>
          </div>
          {context.isPending ? (
            <p className="muted">Loading report context.</p>
          ) : null}
          {context.isError ? (
            <p className="form-error">Incident form data is unavailable.</p>
          ) : null}
          {context.data ? (
            <form className="incident-creation-form" onSubmit={submit}>
              <label className="field">
                <span>Building</span>
                <select
                  name="buildingId"
                  onChange={(event) => {
                    setBuildingId(event.target.value);
                    setMeterId("");
                    setUnitId("");
                  }}
                  required
                  value={buildingId}
                >
                  <option value="">Select building</option>
                  {context.data.buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Unit</span>
                <select
                  disabled={!buildingId}
                  name="unitId"
                  onChange={(event) => setUnitId(event.target.value)}
                  value={unitId}
                >
                  <option value="">No unit selected</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Meter</span>
                <select
                  disabled={!buildingId}
                  name="meterId"
                  onChange={(event) => setMeterId(event.target.value)}
                  value={meterId}
                >
                  <option value="">No meter selected</option>
                  {meters.map((meter) => (
                    <option key={meter.id} value={meter.id}>
                      {meter.externalId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Severity</span>
                <select defaultValue="warning" name="severity" required>
                  {severities.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field incident-title-field">
                <span>Incident title</span>
                <input name="title" required type="text" />
              </label>
              <label className="field incident-description-field">
                <span>Incident description</span>
                <textarea name="description" required rows={3} />
              </label>
              {message ? <p className="form-error">{message}</p> : null}
              <div className="incident-creation-actions">
                <button className="mode-button" onClick={close} type="button">
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Open incident
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
