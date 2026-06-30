import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "../src/migrate";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://iot_local:iot_local_password@localhost:5432/iot_management";

describe("runMigrations", () => {
  let pool: Pool;
  let schema: string;
  let migrationsDirectory: string;

  beforeAll(async () => {
    schema = `test_migrations_${randomUUID().replace(/-/g, "_")}`;
    migrationsDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "iot-migrations-"),
    );
    fs.writeFileSync(
      path.join(migrationsDirectory, "0001_create_widget.sql"),
      "CREATE TABLE widgets (id text PRIMARY KEY, name text NOT NULL);",
    );
    pool = new Pool({ connectionString: databaseUrl });
    await pool.query(`CREATE SCHEMA ${schema}`);
  });

  afterAll(async () => {
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await pool.end();
    }
    fs.rmSync(migrationsDirectory, { force: true, recursive: true });
  });

  it("applies migrations once and skips them on the next run", async () => {
    const first = await runMigrations({
      databaseUrl,
      migrationsDirectory,
      schema,
    });
    const second = await runMigrations({
      databaseUrl,
      migrationsDirectory,
      schema,
    });

    expect(first).toMatchObject({
      appliedCount: 1,
      skippedCount: 0,
      status: "migrations-complete",
    });
    expect(second).toMatchObject({
      appliedCount: 0,
      skippedCount: 1,
      status: "migrations-complete",
    });

    const rows = await pool.query<{ count: string }>(
      `SELECT count(*) FROM ${schema}.schema_migrations`,
    );
    expect(rows.rows[0]?.count).toBe("1");
  });

  it("fails fast when an applied migration checksum changes", async () => {
    await runMigrations({ databaseUrl, migrationsDirectory, schema });
    fs.writeFileSync(
      path.join(migrationsDirectory, "0001_create_widget.sql"),
      "CREATE TABLE widgets (id text PRIMARY KEY, label text NOT NULL);",
    );

    await expect(
      runMigrations({ databaseUrl, migrationsDirectory, schema }),
    ).rejects.toThrow("checksum changed");
  });
});
