import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  dashboardMetricIconNames,
  navigationIconNames,
  topbarActionIconNames,
} from "../lib/iconography";

const styles = readFileSync(resolve(process.cwd(), "app/styles.css"), "utf8");

describe("dashboard iconography", () => {
  it("maps primary navigation labels to domain-specific icons", () => {
    expect(navigationIconNames).toEqual({
      Alerts: "BellRing",
      Buildings: "Building2",
      Dashboard: "LayoutDashboard",
      Meters: "Gauge",
      Reports: "FileBarChart",
      Settings: "Settings",
      Units: "DoorOpen",
    });
  });

  it("maps dashboard metrics to utility scanning icons", () => {
    expect(dashboardMetricIconNames).toEqual({
      "Device Health": "Activity",
      "Electric Usage": "Zap",
      "Open Alerts": "TriangleAlert",
      "Water Usage": "Droplets",
    });
  });

  it("uses command icons for topbar actions", () => {
    expect(topbarActionIconNames).toEqual({
      Export: "Download",
      Search: "Search",
    });
  });

  it("does not draw dashboard icons with pseudo-element borders", () => {
    expect(styles).not.toContain(".metric-icon::after");
    expect(styles).not.toContain(".chart-icon::after");
    expect(styles).not.toContain("border: 2px solid #71717a");
  });

  it("reserves enough width for building chart labels", () => {
    expect(styles).toContain(
      "grid-template-columns: minmax(96px, 32%) minmax(0, 1fr);",
    );
    expect(styles).not.toContain("grid-template-columns: 36px 1fr;");
  });

  it("stacks building chart labels above bars on mobile", () => {
    expect(styles).toContain("grid-template-columns: 1fr;");
    expect(styles).toContain(".bar-row");
  });
});
