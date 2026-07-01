import { describe, expect, it } from "vitest";
import { sanitize } from "./logger";

describe("StructuredLogger sanitize", () => {
  it("redacts sensitive keys and token query parameters from nested log fields", () => {
    const result = sanitize({
      authorization: "Bearer secret-access-token",
      metadata: {
        callbackUrl:
          "https://app.example/reset-password?token=reset-token-123&email=user@example.com",
        password: "plain-text-password",
      },
      nested: [{ resetToken: "nested-reset-token" }],
      safe: "visible",
    });

    expect(result).toEqual({
      authorization: "[redacted]",
      metadata: {
        callbackUrl:
          "https://app.example/reset-password?token=[redacted]&email=user@example.com",
        password: "[redacted]",
      },
      nested: [{ resetToken: "[redacted]" }],
      safe: "visible",
    });
  });
});
