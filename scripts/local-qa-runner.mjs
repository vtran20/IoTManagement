import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qaArtifactRoot = ".qa-artifacts";
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function createQaContext({ now = new Date(), randomSuffix } = {}) {
  const suffix = randomSuffix ?? Math.random().toString(36).slice(2, 8);
  const timestamp = now
    .toISOString()
    .replace(/\.\d{3}Z$/, "")
    .replace(/:/g, "");
  const runId = `${timestamp}-${suffix}`;

  return {
    apiPort: 4101,
    artifactDirectory: path.join(qaArtifactRoot, runId),
    databaseUrl:
      "postgresql://iot_qa:iot_qa_password@127.0.0.1:5432/iot_management_qa",
    projectName: `iot-management-qa-${suffix}`,
    redisUrl: "redis://127.0.0.1:6379",
    runId,
    webPort: 4100,
  };
}

export function shouldRetainArtifacts({ failed }) {
  return failed;
}

export function applyAllocatedPorts(
  context,
  { apiPort, postgresPort, redisPort, webPort },
) {
  return {
    ...context,
    apiPort,
    databaseUrl: `postgresql://iot_qa:iot_qa_password@127.0.0.1:${postgresPort}/iot_management`,
    redisUrl: `redis://127.0.0.1:${redisPort}`,
    webBaseUrl: `http://127.0.0.1:${webPort}`,
    webPort,
  };
}

export function createServiceEnvironment(context) {
  const api = {
    API_PORT: String(context.apiPort),
    DATABASE_URL: context.databaseUrl,
    JWT_SESSION_SECRET: "local-qa-session-secret-with-at-least-24-characters",
    NODE_ENV: "development",
    REDIS_URL: context.redisUrl,
    WEB_BASE_URL: context.webBaseUrl,
  };

  return {
    api,
    dashboard: {
      NEXT_PUBLIC_API_BASE_URL: `http://127.0.0.1:${context.apiPort}/api/v1`,
    },
    worker: { ...api },
  };
}

export function createComposeCommand(context, command) {
  return [
    "compose",
    "--project-name",
    context.projectName,
    "--file",
    "docker-compose.qa.yml",
    ...command,
  ];
}

export function createQaCommands({ mode }) {
  const fast = [
    ["pnpm", ["build"]],
    ["pnpm", ["lint"]],
    ["pnpm", ["typecheck"]],
    ["pnpm", ["test"]],
    ["node", ["--test", "scripts/local-qa-runner.test.mjs"]],
    ["pnpm", ["--filter", "@iot-management/api", "test:e2e"]],
    ["pnpm", ["--filter", "@iot-management/web-dashboard", "test:e2e"]],
  ];

  if (mode !== "fast") {
    throw new Error(`Unsupported QA mode: ${mode}`);
  }

  return fast;
}

export function createPreflightCommands() {
  return [
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
  ];
}

export function environmentForCheck([command, args], environment) {
  if (
    command === "pnpm" &&
    args.join(" ") === "--filter @iot-management/api test:e2e"
  ) {
    return environment.api;
  }
  return {};
}

export async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to allocate a local QA port."));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function runCommand(command, args, options = {}) {
  const {
    allowFailure = false,
    env,
    label = [command, ...args].join(" "),
    logPath,
    output = true,
  } = options;
  const log = logPath ? createWriteStream(logPath, { flags: "a" }) : undefined;
  const child = spawn(command, args, {
    cwd: repositoryRoot,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const forward = (stream, target) => {
    stream.on("data", (chunk) => {
      log?.write(chunk);
      if (output) target.write(chunk);
    });
  };
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  await closeLog(log);

  if (!allowFailure && result.code !== 0) {
    throw new Error(
      `${label} failed with exit code ${result.code ?? "unknown"}.`,
    );
  }
  return result;
}

async function runCapture(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: repositoryRoot,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = [];
  const errors = [];
  child.stdout.on("data", (chunk) => output.push(chunk));
  child.stderr.on("data", (chunk) => errors.push(chunk));
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve({ code }));
  });
  const stdout = Buffer.concat(output).toString("utf8").trim();
  const stderr = Buffer.concat(errors).toString("utf8").trim();
  if (result.code !== 0) {
    throw new Error(
      `${[command, ...args].join(" ")} failed: ${stderr || "no error output"}`,
    );
  }
  return stdout;
}

function startProcess(command, args, options) {
  const child = spawn(command, args, {
    cwd: repositoryRoot,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = createWriteStream(options.logPath, { flags: "a" });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once("error", (error) =>
    log.write(`${error.stack ?? error.message}\n`),
  );
  return { child, log, name: options.name };
}

async function stopProcess(processHandle) {
  if (processHandle.child.exitCode !== null || processHandle.child.signalCode) {
    await closeLog(processHandle.log);
    return;
  }
  processHandle.child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 5_000);
    processHandle.child.once("close", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  if (
    processHandle.child.exitCode === null &&
    !processHandle.child.signalCode
  ) {
    processHandle.child.kill("SIGKILL");
  }
  await closeLog(processHandle.log);
}

async function closeLog(log) {
  if (!log) return;
  await new Promise((resolve) => log.end(resolve));
}

async function waitFor(url, description, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${description} returned ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `${description} did not become ready: ${lastError?.message ?? "timed out"}`,
  );
}

async function waitForLog(logPath, text, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await readFile(logPath, "utf8")).includes(text)) return;
    } catch {
      // The child process may not have created its log yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Worker did not emit ${JSON.stringify(text)} within ${timeoutMs}ms.`,
  );
}

function parseComposePort(value, service) {
  const match = value.match(/:(\d+)$/);
  if (!match) {
    throw new Error(
      `Unable to parse ${service} host port from ${JSON.stringify(value)}.`,
    );
  }
  return Number(match[1]);
}

async function resolveDependencyPorts(context) {
  const [postgres, redis] = await Promise.all([
    runCapture("docker", [
      ...createComposeCommand(context, ["port", "postgres", "5432"]),
    ]),
    runCapture("docker", [
      ...createComposeCommand(context, ["port", "redis", "6379"]),
    ]),
  ]);
  const [apiPort, webPort] = await Promise.all([
    findAvailablePort(),
    findAvailablePort(),
  ]);
  return applyAllocatedPorts(context, {
    apiPort,
    postgresPort: parseComposePort(postgres, "PostgreSQL"),
    redisPort: parseComposePort(redis, "Redis"),
    webPort,
  });
}

async function preflight(context) {
  const logPath = path.join(context.artifactDirectory, "preflight.log");
  for (const [command, args] of createPreflightCommands()) {
    await runCommand(command, args, { logPath });
  }
}

async function runChecks(context, { skipBuild = false } = {}) {
  const serviceEnv = createServiceEnvironment(context);
  const commands = createQaCommands({ mode: "fast" });
  for (const [command, args] of skipBuild ? commands.slice(1) : commands) {
    await runCommand(command, args, {
      env: environmentForCheck([command, args], serviceEnv),
      logPath: path.join(context.artifactDirectory, "checks.log"),
    });
  }
}

async function buildDashboard(context) {
  const environment = createServiceEnvironment(context);
  await runCommand(
    "pnpm",
    ["--filter", "@iot-management/web-dashboard", "build"],
    {
      env: environment.dashboard,
      logPath: path.join(context.artifactDirectory, "dashboard-build.log"),
    },
  );
}

async function runRelease(context, processes) {
  const environment = createServiceEnvironment(context);
  await runChecks(context);
  await buildDashboard(context);
  await runCommand("pnpm", ["db:migrate"], {
    env: environment.api,
    logPath: path.join(context.artifactDirectory, "migration.log"),
  });
  await runCommand("pnpm", ["seed:demo"], {
    env: environment.api,
    logPath: path.join(context.artifactDirectory, "seed.log"),
  });

  const api = startProcess("node", ["apps/api/dist/main.js"], {
    env: environment.api,
    logPath: path.join(context.artifactDirectory, "api.log"),
    name: "api",
  });
  processes.push(api);
  await waitFor(
    `http://127.0.0.1:${context.apiPort}/api/v1/health`,
    "API health endpoint",
  );

  const worker = startProcess("node", ["apps/api/dist/worker.js"], {
    env: environment.worker,
    logPath: path.join(context.artifactDirectory, "worker.log"),
    name: "worker",
  });
  processes.push(worker);
  await waitForLog(
    path.join(context.artifactDirectory, "worker.log"),
    '"status":"worker-started"',
  );

  const dashboard = startProcess(
    "pnpm",
    [
      "--filter",
      "@iot-management/web-dashboard",
      "start",
      "--",
      "-H",
      "127.0.0.1",
      "-p",
      String(context.webPort),
    ],
    {
      env: environment.dashboard,
      logPath: path.join(context.artifactDirectory, "dashboard.log"),
      name: "dashboard",
    },
  );
  processes.push(dashboard);
  await waitFor(context.webBaseUrl, "dashboard");

  await runCommand("pnpm", ["validate:http-client"], {
    logPath: path.join(context.artifactDirectory, "http-client.log"),
  });
  await runCommand(
    "pnpm",
    ["--filter", "@iot-management/web-dashboard", "test:e2e:real"],
    {
      env: {
        QA_ARTIFACT_DIRECTORY: context.artifactDirectory,
        QA_WEB_BASE_URL: context.webBaseUrl,
      },
      logPath: path.join(context.artifactDirectory, "real-browser.log"),
    },
  );
}

async function writeRunContext(context, details) {
  await writeFile(
    path.join(context.artifactDirectory, "run-context.json"),
    `${JSON.stringify({ ...context, ...details }, null, 2)}\n`,
  );
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "fast" && mode !== "release") {
    throw new Error("Usage: node scripts/local-qa-runner.mjs <fast|release>");
  }

  let context = createQaContext();
  let failed = false;
  const processes = [];
  await mkdir(context.artifactDirectory, { recursive: true });

  try {
    await preflight(context);
    await runCommand(
      "docker",
      createComposeCommand(context, ["up", "--wait", "-d"]),
      {
        logPath: path.join(context.artifactDirectory, "compose.log"),
      },
    );
    context = await resolveDependencyPorts(context);
    await writeRunContext(context, {
      mode,
      startedAt: new Date().toISOString(),
    });

    if (mode === "fast") {
      await runChecks(context);
    } else {
      await runRelease(context, processes);
    }
  } catch (error) {
    failed = true;
    console.error(error.stack ?? error.message);
  } finally {
    for (const processHandle of processes.reverse()) {
      await stopProcess(processHandle);
    }
    try {
      await runCommand(
        "docker",
        createComposeCommand(context, [
          "down",
          "--volumes",
          "--remove-orphans",
        ]),
        {
          allowFailure: true,
          logPath: path.join(context.artifactDirectory, "compose.log"),
        },
      );
    } catch {
      failed = true;
    }
    await writeRunContext(context, {
      completedAt: new Date().toISOString(),
      failed,
      mode,
    });
    if (!shouldRetainArtifacts({ failed })) {
      await rm(context.artifactDirectory, { force: true, recursive: true });
    }
  }

  if (failed) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}
