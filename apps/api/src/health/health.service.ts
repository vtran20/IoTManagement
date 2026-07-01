import type { HealthResponse } from "@iot-management/types";
import net from "node:net";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { sql } from "kysely";
import { validateApiEnv } from "../config/env.schema";
import { DatabaseService } from "../database/database.service";

type DependencyStatus = "ok" | "degraded";

export interface HealthDependencyChecks {
  postgres: () => Promise<DependencyStatus>;
  redis: () => Promise<DependencyStatus>;
}

export const HEALTH_DEPENDENCY_CHECKS = Symbol("HEALTH_DEPENDENCY_CHECKS");

@Injectable()
export class HealthService {
  constructor(
    @Optional()
    @Inject(DatabaseService)
    private readonly database?: DatabaseService,

    @Optional()
    @Inject(HEALTH_DEPENDENCY_CHECKS)
    private readonly checks?: HealthDependencyChecks,
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const [postgres, redis] = await Promise.all([
      this.checks?.postgres() ?? this.checkPostgres(),
      this.checks?.redis() ?? this.checkRedis(),
    ]);

    return {
      dependencies: {
        api: { status: "ok" },
        postgres: { status: postgres },
        redis: { status: redis },
      },
      service: "iot-management-api",
      status: "ok",
    };
  }

  private async checkPostgres(): Promise<DependencyStatus> {
    if (!this.database) {
      return "degraded";
    }

    try {
      await sql`select 1`.execute(this.database.db);
      return "ok";
    } catch {
      return "degraded";
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      const redisUrl = new URL(validateApiEnv().redisUrl);
      const port = redisUrl.port ? Number(redisUrl.port) : 6379;
      await connectTcp(redisUrl.hostname, port, 750);
      return "ok";
    } catch {
      return "degraded";
    }
  }
}

function connectTcp(host: string, port: number, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Redis health check timed out"));
    }, timeoutMs);

    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.end();
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
