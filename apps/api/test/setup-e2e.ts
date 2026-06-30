import { randomUUID } from "node:crypto";
import { afterAll, beforeAll } from "vitest";
import { Pool } from "pg";
import { runMigrations } from "../src/migrate";

const databaseUrl = (
  process.env.DATABASE_URL ??
  "postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management"
).replace("@localhost:", "@127.0.0.1:");
const schema = `test_e2e_${randomUUID().replace(/-/g, "_")}`;
let pool: Pool | undefined;

process.env.DATABASE_URL = databaseUrl;
process.env.DATABASE_SCHEMA = schema;

beforeAll(async () => {
  pool = new Pool({ connectionString: databaseUrl });
  await pool.query(`CREATE SCHEMA ${schema}`);
  await runMigrations({ databaseUrl, schema });
});

afterAll(async () => {
  if (!pool) {
    return;
  }
  await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await pool.end();
});
