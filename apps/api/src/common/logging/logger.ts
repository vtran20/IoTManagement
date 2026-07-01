import { Injectable } from "@nestjs/common";

type LogFields = Record<string, unknown>;

const sensitiveKeys = [
  "authorization",
  "cookie",
  "csrf",
  "password",
  "session",
  "secret",
  "token",
  "deviceCredential",
];

@Injectable()
export class StructuredLogger {
  error(message: string, fields: LogFields = {}) {
    console.error(JSON.stringify(this.entry("error", message, fields)));
  }

  info(message: string, fields: LogFields = {}) {
    console.log(JSON.stringify(this.entry("info", message, fields)));
  }

  private entry(level: "error" | "info", message: string, fields: LogFields) {
    const sanitizedFields = sanitize(fields) as LogFields;
    return {
      ...sanitizedFields,
      level,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}

export function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }

  if (value && typeof value === "object") {
    const sanitized: LogFields = {};
    for (const [key, child] of Object.entries(value)) {
      sanitized[key] = isSensitiveKey(key) ? "[redacted]" : sanitize(child);
    }
    return sanitized;
  }

  if (typeof value === "string") {
    return redactSensitiveString(value);
  }

  return value;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return sensitiveKeys.some((sensitiveKey) =>
    normalized.includes(sensitiveKey.toLowerCase()),
  );
}

function redactSensitiveString(value: string): string {
  return value.replace(
    /([?&](?:token|accessToken|resetToken|session|secret|password)=)[^&\s]+/gi,
    "$1[redacted]",
  );
}
