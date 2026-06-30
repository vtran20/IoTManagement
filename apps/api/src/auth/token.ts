import { createHmac, timingSafeEqual } from "node:crypto";

const secret =
  process.env.JWT_SESSION_SECRET ??
  process.env.AUTH_TOKEN_SECRET ??
  "local-development-session-secret";

interface TokenPayload {
  userId: string;
  organizationId: string;
}

export function signToken(payload: TokenPayload): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | undefined {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return undefined;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return undefined;
  }

  return JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
}

function sign(value: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}
