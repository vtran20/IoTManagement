import type { DashboardOperationsResponse } from "@iot-management/types";
import { dashboardMetricIconFor } from "../../lib/iconography";

export function OperationsSummary({
  operations,
}: {
  operations: DashboardOperationsResponse;
}) {
  return (
    <section
      aria-label="Operational summary"
      className="operations-metric-strip"
    >
      {operationSummaryCards(operations).map((card) => {
        const Icon = dashboardMetricIconFor(card.label);
        return (
          <a className="metric-card" href={card.href} key={card.label}>
            <div className="metric-label-row">
              <span className="metric-icon">
                <Icon aria-hidden="true" />
              </span>
              <h2>{card.label}</h2>
            </div>
            <p className="previous">{card.support}</p>
            <strong>{card.value}</strong>
          </a>
        );
      })}
    </section>
  );
}

export function operationSummaryCards(operations: DashboardOperationsResponse) {
  return [
    {
      href: "/alerts",
      label: "Critical alerts" as const,
      support:
        operations.criticalAlertCount === 0
          ? "No critical alerts"
          : "Respond now",
      value: String(operations.criticalAlertCount),
    },
    {
      href: "/incidents",
      label: "Incidents without repair" as const,
      support:
        operations.incidentsWithoutRepairCount === 0
          ? "No incidents need repair"
          : "Needs repair planning",
      value: String(operations.incidentsWithoutRepairCount),
    },
    {
      href: "/work-orders?overdue=true",
      label: "Overdue work" as const,
      support:
        operations.overdueWorkOrderCount === 0
          ? "No overdue repairs"
          : "Vendor or team follow-up",
      value: String(operations.overdueWorkOrderCount),
    },
    {
      href: "/meters",
      label: "Devices offline" as const,
      support:
        operations.offlineMeterCount === 0
          ? "All devices reporting"
          : "Inspect meter connectivity",
      value: String(operations.offlineMeterCount),
    },
  ];
}
