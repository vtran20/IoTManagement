import { validateApiEnv } from "./config/env.schema";
import { jobQueues } from "./jobs/queues";

const env = validateApiEnv();
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

function shutdown(signal: NodeJS.Signals): void {
  clearInterval(heartbeat);
  console.log(JSON.stringify({ signal, status: "worker-stopped" }));
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
