import { Queue } from "bullmq";

export const STUDIO_QUEUE = "studio-workflows";

export function redisConnection() {
  const value = process.env.REDIS_URL;
  if (!value) throw new Error("REDIS_URL is required for the background worker");
  const url = new URL(value);
  const db = Number(url.pathname.replace(/^\//, "") || "0");
  return {
    host: url.hostname,
    port: Number(url.port || (url.protocol === "rediss:" ? 6380 : 6379)),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null as null
  };
}

let queue: Queue | undefined;

export function getStudioQueue() {
  queue ??= new Queue(STUDIO_QUEUE, { connection: redisConnection() });
  return queue;
}

export async function enqueueGeneration(jobId: string) {
  await getStudioQueue().add("generate", { generationJobId: jobId }, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 15_000 },
    removeOnComplete: 500,
    removeOnFail: 1000
  });
}
