import { NestFactory } from "@nestjs/core";
import { Worker } from "bullmq";
import { AppModule } from "./app.module";
import { validateApiEnv } from "./config/env.schema";
import {
  IncidentEscalationJobData,
  jobQueues,
  redisConnectionOptions,
} from "./jobs/queues";
import { IncidentEscalationService } from "./notifications/incident-escalation.service";

async function start(): Promise<void> {
  const env = validateApiEnv();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });
  const escalationService = app.get(IncidentEscalationService);
  const incidentEscalationWorker = new Worker<IncidentEscalationJobData>(
    jobQueues.incidentEscalation,
    async (job) => escalationService.process(job.data),
    { connection: redisConnectionOptions(env.redisUrl) },
  );
  const heartbeat = setInterval(() => {
    console.log(
      JSON.stringify({
        queues: Object.values(jobQueues),
        status: "worker-heartbeat",
        timestamp: new Date().toISOString(),
      }),
    );
  }, 60_000);

  console.log(
    JSON.stringify({
      nodeEnv: env.nodeEnv,
      queues: Object.values(jobQueues),
      redisUrlHost: new URL(env.redisUrl).host,
      status: "worker-started",
    }),
  );

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    clearInterval(heartbeat);
    await incidentEscalationWorker.close();
    await app.close();
    console.log(JSON.stringify({ signal, status: "worker-stopped" }));
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void start().catch((error: Error) => {
  console.error(error);
  process.exitCode = 1;
});
