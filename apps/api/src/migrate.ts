import fs from "node:fs";
import path from "node:path";
import { validateApiEnv } from "./config/env.schema";

function findMigrationDirectory(): string {
  const candidates = [
    path.join(process.cwd(), "db", "migrations"),
    path.join(process.cwd(), "apps", "api", "db", "migrations"),
    path.join(__dirname, "..", "db", "migrations"),
  ];
  const directory = candidates.find((candidate) => fs.existsSync(candidate));
  if (!directory) {
    throw new Error(
      `Unable to find migration directory. Checked: ${candidates.join(", ")}`,
    );
  }
  return directory;
}

function listMigrationFiles(directory: string): string[] {
  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
}

async function run(): Promise<void> {
  const env = validateApiEnv();
  const migrationDirectory = findMigrationDirectory();
  const migrations = listMigrationFiles(migrationDirectory);

  if (migrations.length === 0) {
    throw new Error(`No SQL migrations found in ${migrationDirectory}`);
  }

  console.log(
    JSON.stringify({
      databaseUrlHost: new URL(env.databaseUrl).host,
      migrationCount: migrations.length,
      migrations,
      status: "migration-assets-validated",
    }),
  );
}

void run().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
