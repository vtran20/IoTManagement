import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("compiled API runtime dependencies", () => {
  it("loads the shared types package through Node", () => {
    const result = spawnSync(
      process.execPath,
      ["-e", "require('@iot-management/types')"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status, result.stderr).toBe(0);
  });
});
