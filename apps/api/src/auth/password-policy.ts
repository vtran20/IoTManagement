import { HttpStatus } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { verifyPassword } from "./password";

export const minimumPasswordLength = 12;

export function assertPasswordPolicy(newPassword: string | undefined): string {
  if (!newPassword || newPassword.length < minimumPasswordLength) {
    throw new ApiError(
      "PASSWORD_POLICY_FAILED",
      `Password must be at least ${minimumPasswordLength} characters`,
      HttpStatus.BAD_REQUEST,
    );
  }
  return newPassword;
}

export function assertPasswordIsNotReused(
  newPassword: string,
  currentPasswordHash: string,
): void {
  if (verifyPassword(newPassword, currentPasswordHash)) {
    throw new ApiError(
      "PASSWORD_REUSE_FORBIDDEN",
      "New password must be different from the current password",
      HttpStatus.BAD_REQUEST,
    );
  }
}
