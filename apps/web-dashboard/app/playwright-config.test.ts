import { describe, expect, it } from "vitest";
import config from "../playwright.config";

describe("mocked Playwright configuration", () => {
  it("excludes real-stack release workflows", () => {
    expect(config.testIgnore).toContain("**/real-stack/**");
  });
});
