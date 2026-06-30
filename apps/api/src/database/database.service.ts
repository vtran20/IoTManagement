import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { validateApiEnv } from "../config/env.schema";
import type { DatabaseSchema } from "./schema";

export interface DatabaseServiceOptions {
  databaseUrl?: string;
  schema?: string;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  readonly db: Kysely<DatabaseSchema>;

  constructor(
    @Inject("DATABASE_OPTIONS") options: DatabaseServiceOptions = {},
  ) {
    const env = validateApiEnv();
    this.pool = new Pool({
      connectionString: options.databaseUrl ?? env.databaseUrl,
    });
    this.db = new Kysely<DatabaseSchema>({
      dialect: new PostgresDialect({ pool: this.pool }),
    });

    const schema = options.schema ?? env.databaseSchema;
    if (schema) {
      this.pool.on("connect", (client) => {
        void client.query(`SET search_path TO ${quoteIdentifier(schema)}`);
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
  }
}

function quoteIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid PostgreSQL identifier: ${value}`);
  }
  return `"${value.replace(/"/g, '""')}"`;
}
