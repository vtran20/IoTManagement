import { HttpException, HttpStatus } from "@nestjs/common";
import { lastValueFrom, of, throwError } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { StructuredLogger } from "../logging/logger";
import { DashboardTimingInterceptor } from "./dashboard-timing.interceptor";

describe("DashboardTimingInterceptor", () => {
  it("logs one sanitized timing record and sets Server-Timing outside production", async () => {
    const logger = {
      info: vi.fn(),
    } as unknown as StructuredLogger;
    const setHeader = vi.fn();
    const interceptor = new DashboardTimingInterceptor(logger, "test");

    await lastValueFrom(
      interceptor.intercept(
        context(
          {
            originalUrl:
              "/api/v1/dashboard/overview?buildingId=building_secret&token=secret",
            requestId: "request-123",
          },
          setHeader,
        ),
        { handle: () => of({ ok: true }) },
      ),
    );

    expect(logger.info).toHaveBeenCalledWith(
      "Dashboard endpoint timing",
      expect.objectContaining({
        endpoint: "dashboard.overview",
        method: "GET",
        requestId: "request-123",
        slow: false,
        statusCode: 200,
      }),
    );
    expect(logger.info).not.toHaveBeenCalledWith(
      "Dashboard endpoint timing",
      expect.objectContaining({
        path: expect.anything(),
        token: expect.anything(),
      }),
    );
    expect(setHeader).toHaveBeenCalledWith(
      "Server-Timing",
      expect.stringMatching(/^dashboard;dur=\d+(?:\.\d+)?$/),
    );
  });

  it("logs a failed dashboard request and does not expose timing in production", async () => {
    const logger = {
      info: vi.fn(),
    } as unknown as StructuredLogger;
    const setHeader = vi.fn();
    const interceptor = new DashboardTimingInterceptor(logger, "production");

    await expect(
      lastValueFrom(
        interceptor.intercept(
          context({ originalUrl: "/api/v1/dashboard/units" }, setHeader),
          {
            handle: () =>
              throwError(
                () => new HttpException("No data", HttpStatus.BAD_REQUEST),
              ),
          },
        ),
      ),
    ).rejects.toThrow("No data");

    expect(logger.info).toHaveBeenCalledWith(
      "Dashboard endpoint timing",
      expect.objectContaining({
        endpoint: "dashboard.units",
        statusCode: HttpStatus.BAD_REQUEST,
      }),
    );
    expect(setHeader).not.toHaveBeenCalled();
  });
});

function context(
  request: { method?: string; originalUrl: string; requestId?: string },
  setHeader: ReturnType<typeof vi.fn>,
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: "GET", ...request }),
      getResponse: () => ({ setHeader, statusCode: 200 }),
    }),
  } as never;
}
