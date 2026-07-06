import { describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import type { AlertEvaluatorService } from "./alert-evaluator.service";
import { AlertEventsService } from "./alert-events.service";
import type { StructuredLogger } from "../common/logging/logger";

const ownerContext: RequestContext = {
  membership: {
    id: "membership_north_owner",
    organizationId: "org_north",
    role: "owner",
    status: "active",
    userId: "user_north_owner",
  },
  organization: {
    createdAt: "2026-06-29T00:00:00.000Z",
    id: "org_north",
    name: "North Properties",
    status: "active",
  },
  user: {
    createdAt: "2026-06-29T00:00:00.000Z",
    email: "owner@north.example",
    id: "user_north_owner",
    name: "North Owner",
  },
};

describe("AlertEventsService", () => {
  it("persists acknowledgement and resolution lifecycle states", async () => {
    const persistence = new InMemoryPersistenceService();
    const event = persistence.createAlertEvent({
      message: "Water use exceeded the threshold.",
      organizationId: "org_north",
      severity: "warning",
      title: "High water usage",
      triggeredAt: "2026-07-06T12:00:00.000Z",
    });
    const logger = { info: vi.fn() } as unknown as StructuredLogger;
    const service = new AlertEventsService(
      persistence,
      {} as AlertEvaluatorService,
      logger,
    );

    const acknowledged = await service.acknowledge(ownerContext, event.id);
    expect(acknowledged).toMatchObject({
      acknowledgedAt: expect.any(String),
      status: "acknowledged",
    });

    const resolved = await service.resolve(ownerContext, event.id);
    expect(resolved).toMatchObject({
      resolvedAt: expect.any(String),
      status: "resolved",
    });
    expect(
      persistence
        .listAuditLogs({ organizationId: "org_north" })
        .map((log) => log.action),
    ).toEqual(expect.arrayContaining(["alert.acknowledged", "alert.resolved"]));
  });
});
