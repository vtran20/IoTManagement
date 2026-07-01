import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const sessionCookieName = "iot_management_session";
export const csrfHeaderName = "x-csrf-token";
export const sessionDurationMs = 1000 * 60 * 60 * 24 * 7;

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createCsrfToken(sessionToken: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`csrf:${sessionToken}`)
    .digest("base64url");
}

export function isValidCsrfToken(input: {
  csrfToken?: string;
  secret: string;
  sessionToken: string;
}): boolean {
  if (!input.csrfToken) {
    return false;
  }
  const expected = Buffer.from(
    createCsrfToken(input.sessionToken, input.secret),
  );
  const actual = Buffer.from(input.csrfToken);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function getCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  const prefix = `${name}=`;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

export function serializeSessionCookie(input: {
  expiresAt: Date;
  secure: boolean;
  token: string;
}): string {
  return [
    `${sessionCookieName}=${input.token}`,
    `Max-Age=${Math.floor((input.expiresAt.getTime() - Date.now()) / 1000)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    input.secure ? "Secure" : undefined,
  ]
    .filter(Boolean)
    .join("; ");
}

export function serializeClearSessionCookie(secure: boolean): string {
  return [
    `${sessionCookieName}=`,
    "Max-Age=0",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : undefined,
  ]
    .filter(Boolean)
    .join("; ");
}
