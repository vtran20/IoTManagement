import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.e2e-spec.ts"],
    setupFiles: ["test/setup-e2e.ts"],
    testTimeout: 15000,
  },
});
