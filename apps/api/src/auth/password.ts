import { createHash, timingSafeEqual } from "node:crypto";

export function createPasswordHash(password: string): string {
  return createHash("sha256")
    .update(`iot-management:${password}`)
    .digest("hex");
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): boolean {
  const candidate = Buffer.from(createPasswordHash(password));
  const expected = Buffer.from(passwordHash);

  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}
