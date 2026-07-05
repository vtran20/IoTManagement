import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workOrderDetail = readFileSync(
  resolve(process.cwd(), "app/work-orders/[workOrderId]/work-order-detail.tsx"),
  "utf8",
);
const styles = readFileSync(resolve(process.cwd(), "app/styles.css"), "utf8");

describe("work-order detail layout", () => {
  it("keeps summary labels and values in dedicated responsive grid cells", () => {
    expect(workOrderDetail).toContain(
      'className="data-panel detail-grid work-order-summary"',
    );
    expect(styles).toContain(".work-order-summary {");
    expect(styles).toContain(
      "grid-template-columns: repeat(3, minmax(0, 1fr));",
    );
    expect(styles).toContain(".work-order-summary > div {");
    expect(styles).toContain(".work-order-summary > div:nth-child(-n + 4)");
  });
});
