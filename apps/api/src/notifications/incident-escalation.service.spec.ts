import { describe, expect, it, vi } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { IncidentEscalationService } from "./incident-escalation.service";

describe("IncidentEscalationService", () => {
  it("escalates an unacknowledged critical incident once the deadline job runs", async () => {
    const persistence = new InMemoryPersistenceService();
    const incident = persistence.createLeakIncident({
      buildingId: "building_north_1",
      description: "Water is leaking from the main riser.",
      detectedAt: "2026-07-03T12:00:00.000Z",
      organizationId: "org_north",
      severity: "critical",
      source: "manual_report",
      title: "Main riser leak",
    });
    const notifications = {
      notifyAcknowledgementOverdue: vi.fn(async () => undefined),
    };
    const service = new IncidentEscalationService(
      persistence,
      notifications as never,
    );

    await expect(
      service.process({ incidentId: incident.id, organizationId: "org_north" }),
    ).resolves.toEqual({ status: "escalated" });
    expect(notifications.notifyAcknowledgementOverdue).toHaveBeenCalledWith(
      incident,
    );
  });

  it("does not escalate incidents that have already been acknowledged", async () => {
    const persistence = new InMemoryPersistenceService();
    const incident = persistence.createLeakIncident({
      buildingId: "building_north_1",
      description: "Water is leaking from the main riser.",
      detectedAt: "2026-07-03T12:00:00.000Z",
      organizationId: "org_north",
      severity: "warning",
      source: "manual_report",
      title: "Main riser leak",
    });
    persistence.updateLeakIncident("org_north", incident.id, {
      acknowledgedAt: "2026-07-03T12:01:00.000Z",
      status: "acknowledged",
    });
    const notifications = {
      notifyAcknowledgementOverdue: vi.fn(async () => undefined),
    };
    const service = new IncidentEscalationService(
      persistence,
      notifications as never,
    );

    await expect(
      service.process({ incidentId: incident.id, organizationId: "org_north" }),
    ).resolves.toEqual({ status: "skipped" });
    expect(notifications.notifyAcknowledgementOverdue).not.toHaveBeenCalled();
  });
});
