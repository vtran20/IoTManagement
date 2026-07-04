import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "features/reports/leak-response-report.tsx"),
  "utf8",
);
const styles = readFileSync(resolve(process.cwd(), "app/styles.css"), "utf8");

describe("LeakResponseReport layout", () => {
  it("declares its full-width workspace root class", () => {
    expect(source).toContain('className="leak-response-report"');
    expect(styles).toContain(".leak-response-report {\n  grid-column: 1 / -1;");
  });
});
