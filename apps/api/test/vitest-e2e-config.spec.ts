import { describe, expect, it } from "vitest";
import config from "../vitest.e2e.config";

describe("API e2e Vitest configuration", () => {
  it("runs all e2e files in one serial worker", () => {
    expect(config.test?.fileParallelism).toBe(false);
    expect(config.test?.pool).toBe("threads");
    expect(config.test?.poolOptions?.threads?.singleThread).toBe(true);
  });
});
