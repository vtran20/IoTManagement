import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const incidentDetail = readFileSync(
  resolve(process.cwd(), "features/incidents/incident-detail.tsx"),
  "utf8",
);

describe("incident work-order state", () => {
  it("does not offer new repair work for resolved incidents", () => {
    expect(incidentDetail).toContain(
      'allowMutations && data.status !== "resolved"',
    );
  });

  it("shows mutation errors as a full-width state panel", () => {
    expect(incidentDetail).toMatch(
      /\{message \? \(\s*<section className="state-panel error-state">\{message\}<\/section>/,
    );
  });
});
