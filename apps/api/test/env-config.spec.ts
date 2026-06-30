import { describe, expect, it } from "vitest";
import { validateApiEnv } from "../src/config/env.schema";

describe("validateApiEnv", () => {
  it("fails fast when production required variables are missing", () => {
    expect(() =>
      validateApiEnv({
        NODE_ENV: "production",
      }),
    ).toThrow(
      "Missing required environment variables: API_PORT, DATABASE_URL, REDIS_URL, JWT_SESSION_SECRET",
    );
  });

  it("fails fast for invalid production values", () => {
    expect(() =>
      validateApiEnv({
        API_PORT: "not-a-port",
        DATABASE_URL: "postgres://iot:secret@postgres:5432/iot_management",
        JWT_SESSION_SECRET: "short",
        NODE_ENV: "production",
        REDIS_URL: "http://redis:6379",
      }),
    ).toThrow(
      "Invalid environment variables: API_PORT must be an integer between 1 and 65535; REDIS_URL must start with redis:// or rediss://; JWT_SESSION_SECRET must be at least 24 characters",
    );
  });

  it("returns normalized values and development defaults", () => {
    expect(validateApiEnv({ NODE_ENV: "development" })).toEqual({
      apiPort: 3001,
      databaseSchema: "public",
      databaseUrl:
        "postgresql://iot_local:iot_local_password@localhost:5432/iot_management",
      jwtSessionSecret: "local-development-session-secret",
      nodeEnv: "development",
      redisUrl: "redis://localhost:6379",
    });
  });
});
