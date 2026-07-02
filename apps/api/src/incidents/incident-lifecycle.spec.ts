import { describe, expect, it } from "vitest";
import { getIncidentTransition } from "./incident-lifecycle";

describe("getIncidentTransition", () => {
  it("allows only the next operational lifecycle state", () => {
    expect(getIncidentTransition("open", "acknowledged")).toMatchObject({
      timestampField: "acknowledgedAt",
    });
    expect(
      getIncidentTransition("acknowledged", "investigating"),
    ).toMatchObject({
      timestampField: "investigatingAt",
    });
    expect(getIncidentTransition("monitoring", "resolved")).toMatchObject({
      timestampField: "resolvedAt",
    });
    expect(getIncidentTransition("open", "contained")).toBeUndefined();
    expect(getIncidentTransition("resolved", "monitoring")).toBeUndefined();
  });
});
