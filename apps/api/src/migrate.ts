import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Pool, PoolClient } from "pg";
import { validateApiEnv } from "./config/env.schema";

const MIGRATION_LOCK_KEY = 2026063001;

export interface RunMigrationsOptions {
  databaseUrl?: string;
  migrationsDirectory?: string;
  schema?: string;
}

export interface RunMigrationsResult {
  appliedCount: number;
  databaseUrlHost: string;
  migrations: string[];
  skippedCount: number;
  status: "migrations-complete";
}

export function findMigrationDirectory(): string {
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

export function listMigrationFiles(directory: string): string[] {
  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
}

export async function runMigrations(
  options: RunMigrationsOptions = {},
): Promise<RunMigrationsResult> {
  const env = validateApiEnv();
  const databaseUrl = options.databaseUrl ?? env.databaseUrl;
  const schema = options.schema ?? env.databaseSchema;
  const migrationDirectory =
    options.migrationsDirectory ?? findMigrationDirectory();
  const migrations = listMigrationFiles(migrationDirectory);

  if (migrations.length === 0) {
    throw new Error(`No SQL migrations found in ${migrationDirectory}`);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  let appliedCount = 0;
  let skippedCount = 0;

  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    await ensureMigrationTable(client, schema);

    for (const migration of migrations) {
      const filePath = path.join(migrationDirectory, migration);
      const sql = fs.readFileSync(filePath, "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");
      const existing = await client.query<{ checksum: string }>(
        `SELECT checksum FROM ${qualified(schema, "schema_migrations")} WHERE version = $1`,
        [migration],
      );

      if (existing.rowCount && existing.rows[0]?.checksum === checksum) {
        skippedCount += 1;
        continue;
      }

      if (existing.rowCount) {
        throw new Error(
          `Migration ${migration} checksum changed after it was applied`,
        );
      }

      await client.query("BEGIN");
      try {
        await client.query(
          `SET LOCAL search_path TO ${quoteIdentifier(schema)}`,
        );
        await client.query(sql);
        await client.query(
          `INSERT INTO ${qualified(schema, "schema_migrations")} (version, checksum) VALUES ($1, $2)`,
          [migration, checksum],
        );
        await client.query("COMMIT");
        appliedCount += 1;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    } finally {
      client.release();
      await pool.end();
    }
  }

  return {
    appliedCount,
    databaseUrlHost: new URL(databaseUrl).host,
    migrations,
    skippedCount,
    status: "migrations-complete",
  };
}

async function ensureMigrationTable(
  client: PoolClient,
  schema: string,
): Promise<void> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema)}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${qualified(schema, "schema_migrations")} (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

function qualified(schema: string, table: string): string {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}

function quoteIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid PostgreSQL identifier: ${value}`);
  }
  return `"${value.replace(/"/g, '""')}"`;
}

async function run(): Promise<void> {
  const result = await runMigrations();
  console.log(JSON.stringify(result));
}

if (require.main === module) {
  void run().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
