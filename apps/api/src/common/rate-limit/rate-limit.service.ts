import { HttpStatus, Injectable } from "@nestjs/common";
import { ApiError } from "../errors/api-error";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  check(input: {
    key: string;
    limit: number;
    message: string;
    now?: number;
    windowMs: number;
  }) {
    const now = input.now ?? Date.now();
    const current = this.buckets.get(input.key);
    const bucket =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + input.windowMs };

    bucket.count += 1;
    this.buckets.set(input.key, bucket);

    if (bucket.count > input.limit) {
      throw new ApiError(
        "RATE_LIMITED",
        input.message,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
