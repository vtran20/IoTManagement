export interface ApiEnv {
  apiPort: number;
  databaseSchema: string;
  databaseUrl: string;
  jwtSessionSecret: string;
  nodeEnv: "development" | "test" | "production";
  redisUrl: string;
}

type EnvInput = Record<string, string | undefined>;

const developmentDefaults = {
  API_PORT: "3001",
  DATABASE_URL:
    "postgresql://iot_local:iot_local_password@localhost:5432/iot_management",
  DATABASE_SCHEMA: "public",
  JWT_SESSION_SECRET: "local-development-session-secret",
  REDIS_URL: "redis://localhost:6379",
};

const requiredVariables = [
  "API_PORT",
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SESSION_SECRET",
] as const;

export function validateApiEnv(input: EnvInput = process.env): ApiEnv {
  const nodeEnv = normalizeNodeEnv(input.NODE_ENV);
  const withDefaults =
    nodeEnv === "production" ? input : { ...developmentDefaults, ...input };
  const missing = requiredVariables.filter((key) => !withDefaults[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const errors = [
    validatePort(withDefaults.API_PORT!),
    validateDatabaseUrl(withDefaults.DATABASE_URL!),
    validateDatabaseSchema(withDefaults.DATABASE_SCHEMA || "public"),
    validateRedisUrl(withDefaults.REDIS_URL!),
    validateSecret(withDefaults.JWT_SESSION_SECRET!),
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(`Invalid environment variables: ${errors.join("; ")}`);
  }

  return {
    apiPort: Number(withDefaults.API_PORT),
    databaseSchema: withDefaults.DATABASE_SCHEMA || "public",
    databaseUrl: withDefaults.DATABASE_URL!,
    jwtSessionSecret: withDefaults.JWT_SESSION_SECRET!,
    nodeEnv,
    redisUrl: withDefaults.REDIS_URL!,
  };
}

function normalizeNodeEnv(value: string | undefined): ApiEnv["nodeEnv"] {
  if (value === "production" || value === "test") {
    return value;
  }
  return "development";
}

function validatePort(value: string): string | undefined {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return "API_PORT must be an integer between 1 and 65535";
  }
  return undefined;
}

function validateDatabaseUrl(value: string): string | undefined {
  if (!value.startsWith("postgresql://") && !value.startsWith("postgres://")) {
    return "DATABASE_URL must start with postgresql:// or postgres://";
  }
  return undefined;
}

function validateDatabaseSchema(value: string): string | undefined {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    return "DATABASE_SCHEMA must be a valid PostgreSQL identifier";
  }
  return undefined;
}

function validateRedisUrl(value: string): string | undefined {
  if (!value.startsWith("redis://") && !value.startsWith("rediss://")) {
    return "REDIS_URL must start with redis:// or rediss://";
  }
  return undefined;
}

function validateSecret(value: string): string | undefined {
  if (value.length < 24) {
    return "JWT_SESSION_SECRET must be at least 24 characters";
  }
  return undefined;
}
