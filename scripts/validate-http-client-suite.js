const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const repositoryRoot = join(__dirname, "..");
const httpDirectory = join(repositoryRoot, "http");
const apiSourceDirectory = join(repositoryRoot, "apps", "api", "src");

function listControllerFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listControllerFiles(path);
    return entry.name.endsWith(".controller.ts") ? [path] : [];
  });
}

function collectControllerEndpoints() {
  const endpoints = new Set();

  for (const controllerFile of listControllerFiles(apiSourceDirectory)) {
    const source = readFileSync(controllerFile, "utf8");
    const controllerMatches = [...source.matchAll(/@Controller\((?:"([^"]*)")?\)/g)];

    for (const [index, controllerMatch] of controllerMatches.entries()) {
      const controllerStart = controllerMatch.index;
      const nextControllerStart = controllerMatches[index + 1]?.index;
      const controllerSource = source.slice(controllerStart, nextControllerStart);
      const prefix = controllerMatch[1] ?? "";
      const requestPattern = /@(Get|Post|Patch|Put|Delete)\((?:"([^"]*)")?\)/g;

      for (const requestMatch of controllerSource.matchAll(requestPattern)) {
        const method = requestMatch[1].toUpperCase();
        const suffix = requestMatch[2] ?? "";
        const route = `/${[prefix, suffix].filter(Boolean).join("/")}`;
        endpoints.add(`${method} ${route}`);
      }
    }
  }

  return [...endpoints].sort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requestPattern(method, route) {
  const routePattern = route
    .split(/(:[^/]+)/g)
    .map((part) => (part.startsWith(":") ? "\\{\\{[^}]+\\}\\}" : escapeRegExp(part)))
    .join("");
  return new RegExp(`${method}\\s+\\{\\{baseUrl\\}\\}${routePattern}`);
}

const requestText = readdirSync(httpDirectory)
  .filter((fileName) => fileName.endsWith(".http"))
  .map((fileName) => readFileSync(join(httpDirectory, fileName), "utf8"))
  .join("\n");
const endpoints = collectControllerEndpoints();
const missing = endpoints.filter((endpoint) => {
  const [method, route] = endpoint.split(" ");
  return !requestPattern(method, route).test(requestText);
});

if (missing.length > 0) {
  console.error("Missing IntelliJ HTTP Client requests:");
  for (const endpoint of missing) console.error(`- ${endpoint}`);
  process.exitCode = 1;
} else {
  console.log(
    `HTTP Client coverage complete: ${endpoints.length} controller endpoints.`,
  );
}
