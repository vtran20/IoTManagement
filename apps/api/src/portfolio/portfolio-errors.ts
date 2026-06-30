import { HttpStatus } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";

export function tenantResourceNotFound(resource: string): ApiError {
  return new ApiError(
    "TENANT_RESOURCE_NOT_FOUND",
    `${resource} was not found in the authenticated tenant scope`,
    HttpStatus.NOT_FOUND,
  );
}
