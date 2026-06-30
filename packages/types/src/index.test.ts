import { describe, expect, it } from "vitest";
import { platformName } from "./index";

describe("platformName", () => {
  it("identifies the shared IoT platform", () => {
    expect(platformName).toBe("IoT Management");
  });
});
