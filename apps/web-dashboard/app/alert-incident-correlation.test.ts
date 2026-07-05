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
const styles = readFileSync(resolve(process.cwd(), "app/styles.css"), "utf8");

describe("alert incident correlation", () => {
  it("offers deliberate incident actions only from unlinked alerts", () => {
    expect(alertsTable).toContain("Create incident");
    expect(alertsTable).toContain("Link existing incident");
    expect(alertsTable).toContain("!alert.incidentId ?");
  });

  it("shows related alerts in the incident detail workflow", () => {
    expect(incidentDetail).toContain("Related alerts");
    expect(incidentDetail).toContain("data.relatedAlerts ?? []");
  });

  it("keeps alert rule fields and actions in stable layout groups", () => {
    expect(alertsTable).toContain('className="inline-form alert-rule-form"');
    expect(alertsTable).toContain('className="alert-actions"');
    expect(styles).toContain(".alert-rule-form > .field");
    expect(styles).toContain(".alert-actions");
    expect(styles).toContain(
      ".alert-actions {\n  display: grid;\n  gap: 8px;\n  margin-top: 8px;",
    );
  });
});
