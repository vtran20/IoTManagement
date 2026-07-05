import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const vendorsPanel = readFileSync(
  resolve(process.cwd(), "app/settings/vendors/vendors-panel.tsx"),
  "utf8",
);
const workOrderDetail = readFileSync(
  resolve(process.cwd(), "app/work-orders/[workOrderId]/work-order-detail.tsx"),
  "utf8",
);

describe("async form submissions", () => {
  it("keeps a stable form reference for post-request resets", () => {
    for (const source of [vendorsPanel, workOrderDetail]) {
      expect(source).toContain("const formElement = event.currentTarget;");
      expect(source).toContain("formElement.reset();");
      expect(source).not.toContain("event.currentTarget.reset();");
    }
  });
});
