import { randomUUID } from "node:crypto";
import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Response } from "express";
import type { RequestWithContext } from "../request-context";

const requestIdHeader = "x-request-id";

@Injectable()
export class RequestSecurityMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: NextFunction) {
    const requestId = normalizeRequestId(request.headers[requestIdHeader]);
    request.requestId = requestId;

    response.setHeader(requestIdHeader, requestId);
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("x-frame-options", "DENY");
    response.setHeader("referrer-policy", "no-referrer");
    response.setHeader(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=()",
    );
    response.setHeader(
      "content-security-policy",
      "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );

    next();
  }
}

function normalizeRequestId(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate && /^[A-Za-z0-9._:-]{1,128}$/.test(candidate)) {
    return candidate;
  }
  return randomUUID();
}
