// backend/src/lib/redis.ts
import { ConnectionOptions } from "bullmq";
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from "../config";

export const redisConnection: ConnectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
};