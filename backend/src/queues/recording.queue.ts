// backend/src/queues/recording.queue.ts
import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis";

export const recordingQueue = new Queue("recording-pipeline", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false, // keep failed jobs visible in dashboard
  },
});