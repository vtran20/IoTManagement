import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const alertsTable = readFileSync(
  resolve(process.cwd(), "features/alerts/alerts-table.tsx"),
  "utf8",
);
const incidentDetail = readFileSync(
  resolve(process.cwd(), "features/incidents/incident-detail.tsx"),
  "utf8",
);

describe("alert incident correlation", () => {
  it("offers deliberate incident actions only from unlinked alerts", () => {
    expect(alertsTable).toContain("Create incident");
    expect(alertsTable).toContain("Link existing incident");
    expect(alertsTable).toContain("!alert.incidentId && allowMutations");
  });

  it("shows related alerts in the incident detail workflow", () => {
    expect(incidentDetail).toContain("Related alerts");
    expect(incidentDetail).toContain("data.relatedAlerts ?? []");
  });
});
