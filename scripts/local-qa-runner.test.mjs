import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAllocatedPorts,
  createComposeCommand,
  createPreflightCommands,
  environmentForCheck,
  createQaCommands,
  createServiceEnvironment,
  createQaContext,
  shouldRetainArtifacts,
} from "./local-qa-runner.mjs";

test("creates a run-scoped environment without using development ports", () => {
  const context = createQaContext({
    now: new Date("2026-07-05T12:34:56.000Z"),
    randomSuffix: "abc123",
  });

  assert.match(context.projectName, /^iot-management-qa-/);
  assert.notEqual(context.apiPort, 3001);
  assert.notEqual(context.webPort, 3000);
  assert.equal(context.databaseUrl.includes("127.0.0.1"), true);
  assert.equal(context.redisUrl.includes("127.0.0.1"), true);
  assert.match(
    context.artifactDirectory,
    /\.qa-artifacts\/2026-07-05T123456-abc123$/,
  );
});

test("retains artifacts only when a release run fails", () => {
  assert.equal(shouldRetainArtifacts({ failed: false }), false);
  assert.equal(shouldRetainArtifacts({ failed: true }), true);
});

test("applies dynamically allocated ports to the QA service environment", () => {
  const context = applyAllocatedPorts(
    createQaContext({ randomSuffix: "ports01" }),
    { apiPort: 48101, postgresPort: 48102, redisPort: 48103, webPort: 48104 },
  );

  assert.equal(context.apiPort, 48101);
  assert.equal(context.webPort, 48104);
  assert.equal(
    context.databaseUrl,
    "postgresql://iot_qa:iot_qa_password@127.0.0.1:48102/iot_management",
  );
  assert.equal(context.redisUrl, "redis://127.0.0.1:48103");
  assert.equal(context.webBaseUrl, "http://127.0.0.1:48104");
});

test("creates isolated API, worker, and dashboard environments", () => {
  const context = applyAllocatedPorts(
    createQaContext({ randomSuffix: "env001" }),
    { apiPort: 49001, postgresPort: 49002, redisPort: 49003, webPort: 49004 },
  );
  const environment = createServiceEnvironment(context);

  assert.deepEqual(environment.api, {
    API_PORT: "49001",
    DATABASE_URL:
      "postgresql://iot_qa:iot_qa_password@127.0.0.1:49002/iot_management",
    JWT_SESSION_SECRET: "local-qa-session-secret-with-at-least-24-characters",
    NODE_ENV: "development",
    REDIS_URL: "redis://127.0.0.1:49003",
    WEB_BASE_URL: "http://127.0.0.1:49004",
  });
  assert.deepEqual(environment.dashboard, {
    NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:49001/api/v1",
  });
  assert.deepEqual(environment.worker, environment.api);
});

test("creates project-scoped compose commands with volume cleanup", () => {
  const context = createQaContext({ randomSuffix: "compose1" });

  assert.deepEqual(createComposeCommand(context, ["up", "--wait", "-d"]), [
    "compose",
    "--project-name",
    "iot-management-qa-compose1",
    "--file",
    "docker-compose.qa.yml",
    "up",
    "--wait",
    "-d",
  ]);
  assert.deepEqual(createComposeCommand(context, ["down", "--volumes"]), [
    "compose",
    "--project-name",
    "iot-management-qa-compose1",
    "--file",
    "docker-compose.qa.yml",
    "down",
    "--volumes",
  ]);
});

test("plans fast checks before the API and mocked browser end-to-end suites", () => {
  const commands = createQaCommands({ mode: "fast" });

  assert.deepEqual(commands, [
    ["pnpm", ["build"]],
    ["pnpm", ["lint"]],
    ["pnpm", ["typecheck"]],
    ["pnpm", ["test"]],
    ["node", ["--test", "scripts/local-qa-runner.test.mjs"]],
    ["pnpm", ["--filter", "@iot-management/api", "test:e2e"]],
    ["pnpm", ["--filter", "@iot-management/web-dashboard", "test:e2e"]],
  ]);
});

test("checks Playwright from the dashboard workspace during preflight", () => {
  assert.deepEqual(createPreflightCommands(), [
    ["docker", ["compose", "version"]],
    ["pnpm", ["--version"]],
    [
      "pnpm",
      [
        "--filter",
        "@iot-management/web-dashboard",
        "exec",
        "playwright",
        "--version",
      ],
    ],
  ]);
});

test("passes isolated service configuration only to API end-to-end tests", () => {
  const environment = {
    api: { DATABASE_URL: "postgresql://qa", NODE_ENV: "development" },
  };

  assert.deepEqual(environmentForCheck(["pnpm", ["build"]], environment), {});
  assert.deepEqual(
    environmentForCheck(
      ["pnpm", ["--filter", "@iot-management/api", "test:e2e"]],
      environment,
    ),
    environment.api,
  );
  assert.deepEqual(
    environmentForCheck(
      ["pnpm", ["--filter", "@iot-management/web-dashboard", "test:e2e"]],
      environment,
    ),
    {},
  );
});
