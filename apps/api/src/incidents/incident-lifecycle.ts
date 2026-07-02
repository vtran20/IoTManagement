import type { LeakIncident } from "@iot-management/types";

export type IncidentTransitionTarget = Exclude<LeakIncident["status"], "open">;

export interface IncidentTransitionDefinition {
  from: LeakIncident["status"];
  summary: string;
  timestampField:
    | "acknowledgedAt"
    | "investigatingAt"
    | "containedAt"
    | "monitoringAt"
    | "resolvedAt";
}

const incidentTransitions: Record<
  IncidentTransitionTarget,
  IncidentTransitionDefinition
> = {
  acknowledged: {
    from: "open",
    summary: "Incident acknowledged",
    timestampField: "acknowledgedAt",
  },
  investigating: {
    from: "acknowledged",
    summary: "Investigation started",
    timestampField: "investigatingAt",
  },
  contained: {
    from: "investigating",
    summary: "Incident contained",
    timestampField: "containedAt",
  },
  monitoring: {
    from: "contained",
    summary: "Monitoring started",
    timestampField: "monitoringAt",
  },
  resolved: {
    from: "monitoring",
    summary: "Incident resolved",
    timestampField: "resolvedAt",
  },
};

export function getIncidentTransition(
  currentStatus: LeakIncident["status"],
  targetStatus: IncidentTransitionTarget,
): IncidentTransitionDefinition | undefined {
  const transition = incidentTransitions[targetStatus];
  return transition.from === currentStatus ? transition : undefined;
}
