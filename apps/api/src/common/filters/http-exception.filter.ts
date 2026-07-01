import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ApiError } from "../errors/api-error";
import { StructuredLogger } from "../logging/logger";
import type { RequestWithContext } from "../request-context";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(StructuredLogger)
    private readonly logger: StructuredLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithContext & Request>();
    const response = http.getResponse<Response>();
    const error = this.toErrorPayload(exception);

    if (error.statusCode >= 500) {
      this.logger.error("Unhandled API exception", {
        code: error.code,
        method: request.method,
        path: request.originalUrl ?? request.url,
        requestId: request.requestId,
        statusCode: error.statusCode,
      });
    }

    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        method: request.method,
        path: request.originalUrl ?? request.url,
        requestId: request.requestId,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private toErrorPayload(exception: unknown) {
    if (exception instanceof ApiError) {
      return {
        code: exception.code,
        message: exception.message,
        statusCode: exception.statusCode,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      return {
        code: statusCode === HttpStatus.NOT_FOUND ? "NOT_FOUND" : "HTTP_ERROR",
        message: exception.message,
        statusCode,
      };
    }

    return {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }
}
