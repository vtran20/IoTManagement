import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const buildingDetail = readFileSync(
  resolve(process.cwd(), "app/buildings/[buildingId]/building-detail.tsx"),
  "utf8",
);
const unitDetail = readFileSync(
  resolve(process.cwd(), "app/units/[unitId]/unit-detail.tsx"),
  "utf8",
);
const meterDetail = readFileSync(
  resolve(process.cwd(), "app/meters/[meterId]/meter-detail.tsx"),
  "utf8",
);
const incidentDetail = readFileSync(
  resolve(process.cwd(), "features/incidents/incident-detail.tsx"),
  "utf8",
);

describe("operational detail breadcrumbs", () => {
  it("uses the shared breadcrumb component on every current detail screen", () => {
    expect(buildingDetail).toContain("Breadcrumbs");
    expect(unitDetail).toContain("Breadcrumbs");
    expect(meterDetail).toContain("Breadcrumbs");
    expect(incidentDetail).toContain("Breadcrumbs");
  });
});
