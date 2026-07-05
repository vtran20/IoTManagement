import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.QA_WEB_BASE_URL;

if (!baseURL) {
  throw new Error(
    "QA_WEB_BASE_URL is required for real-stack Playwright tests.",
  );
}

export default defineConfig({
  testDir: "./tests/real-stack",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  outputDir: process.env.QA_ARTIFACT_DIRECTORY
    ? `${process.env.QA_ARTIFACT_DIRECTORY}/playwright-results`
    : "test-results/real-stack",
  reporter: [
    ["line"],
    [
      "html",
      {
        open: "never",
        outputFolder: process.env.QA_ARTIFACT_DIRECTORY
          ? `${process.env.QA_ARTIFACT_DIRECTORY}/playwright-report`
          : "playwright-report/real-stack",
      },
    ],
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
