import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.e2e-spec.ts"],
    setupFiles: ["test/setup-e2e.ts"],
    fileParallelism: false,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
