import { describe, expect, it } from "vitest";
import { getWorkOrderTransition } from "./work-order-lifecycle";

describe("getWorkOrderTransition", () => {
  it("permits the operational repair lifecycle and prevents reopening completed work", () => {
    expect(getWorkOrderTransition("open", "assigned")).toMatchObject({
      summary: "Work order assigned",
    });
    expect(getWorkOrderTransition("assigned", "in_progress")).toMatchObject({
      summary: "Repair work started",
    });
    expect(getWorkOrderTransition("in_progress", "completed")).toMatchObject({
      summary: "Repair work completed",
    });
    expect(getWorkOrderTransition("completed", "assigned")).toBeUndefined();
    expect(getWorkOrderTransition("open", "completed")).toBeUndefined();
  });
});
