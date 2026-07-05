import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NestInterceptor,
  Optional,
} from "@nestjs/common";
import type { Response } from "express";
import { Observable, catchError, tap, throwError } from "rxjs";
import { StructuredLogger } from "../logging/logger";
import type { RequestWithContext } from "../request-context";

@Injectable()
export class DashboardTimingInterceptor implements NestInterceptor {
  constructor(
    @Inject(StructuredLogger)
    private readonly logger: StructuredLogger,
    @Optional() @Inject("NODE_ENV") private readonly nodeEnv?: string,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();
    const endpoint = dashboardEndpointName(request.originalUrl ?? request.url);

    const record = (statusCode: number) => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      this.logger.info("Dashboard endpoint timing", {
        durationMs: Math.round(durationMs * 100) / 100,
        endpoint,
        method: request.method,
        requestId: request.requestId,
        slow: durationMs >= 1_000,
        statusCode,
      });
      if ((this.nodeEnv ?? process.env.NODE_ENV) !== "production") {
        response.setHeader(
          "Server-Timing",
          `dashboard;dur=${Math.round(durationMs * 100) / 100}`,
        );
      }
    };

    return next.handle().pipe(
      tap(() => record(response.statusCode)),
      catchError((error: unknown) => {
        record(statusCodeFor(error));
        return throwError(() => error);
      }),
    );
  }
}

function dashboardEndpointName(url: string): string {
  const path = url.split("?", 1)[0] ?? "";
  if (path.endsWith("/dashboard/overview")) return "dashboard.overview";
  if (path.endsWith("/dashboard/operations")) return "dashboard.operations";
  if (path.endsWith("/dashboard/summary")) return "dashboard.summary";
  if (path.endsWith("/dashboard/trends")) return "dashboard.trends";
  if (path.endsWith("/dashboard/buildings")) return "dashboard.buildings";
  if (path.endsWith("/dashboard/units")) return "dashboard.units";
  if (path.endsWith("/dashboard/device-health"))
    return "dashboard.deviceHealth";
  return "dashboard.unknown";
}

function statusCodeFor(error: unknown): number {
  if (error instanceof HttpException) {
    return error.getStatus();
  }
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return 500;
}
