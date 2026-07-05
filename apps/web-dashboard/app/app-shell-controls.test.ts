import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "components/app-shell.tsx"),
  "utf8",
);

describe("AppShell controls", () => {
  it("renders route actions only when a page supplies them", () => {
    expect(source).toContain("actions?: ReactNode");
    expect(source).toContain("{actions ?");
    expect(source).not.toContain("<span>Search</span>");
    expect(source).not.toContain("<span>Export</span>");
  });
});
