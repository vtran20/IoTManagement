import { Queue } from "bullmq";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { validateApiEnv } from "../config/env.schema";

export const jobQueues = {
  analyticsAggregation: "analytics-aggregation",
  incidentEscalation: "incident-escalation",
} as const;

export interface IncidentEscalationJobData {
  incidentId: string;
  organizationId: string;
}

@Injectable()
export class IncidentEscalationQueueService implements OnModuleDestroy {
  private readonly queue = new Queue<IncidentEscalationJobData>(
    jobQueues.incidentEscalation,
    { connection: redisConnectionOptions(validateApiEnv().redisUrl) },
  );

  async schedule(input: {
    deadlineAt: string;
    incidentId: string;
    organizationId: string;
  }): Promise<void> {
    await this.queue.add(
      "acknowledgement-deadline",
      {
        incidentId: input.incidentId,
        organizationId: input.organizationId,
      },
      {
        attempts: 3,
        backoff: { delay: 1_000, type: "exponential" },
        delay: Math.max(0, new Date(input.deadlineAt).getTime() - Date.now()),
        jobId: `incident-ack-${input.incidentId}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}

export function redisConnectionOptions(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    port: Number(url.port || 6379),
    tls: url.protocol === "rediss:" ? {} : undefined,
    username: url.username ? decodeURIComponent(url.username) : undefined,
  };
}
