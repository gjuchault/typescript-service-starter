import ms from "ms";
import { createClient as createRedisClient } from "redis";
import { promiseWithTimeout } from "../../helpers/promise-timeout";
import { createLogger } from "../logger";
import type { Telemetry } from "../telemetry";
import { getSpanOptions } from "../telemetry/instrumentations/redis";

interface Dependencies {
  url: string;
  telemetry: Telemetry;
}

export type Cache = ReturnType<typeof createRedisClient>;

export async function createCacheStorage({
  url,
  telemetry,
}: Dependencies): Promise<Cache> {
  const logger = createLogger("redis");

  const redis = createRedisClient({ url });

  redis.on("error", (error) => {
    // these will be spamming quite a log stderr if the redis server is not
    // running when starting this service
    if (error.code === "ECONNREFUSED") {
      return;
    }

    logger.error("redis error", { error });
  });

  return telemetry.startSpan("redis.connect", getSpanOptions(url), async () => {
    logger.debug("connecting to redis...");

    try {
      await promiseWithTimeout(ms("2s"), () => redis.connect());
    } catch (error) {
      logger.error("redis connection error", { error });
      throw error;
    }

    logger.info("connected to redis");

    return redis;
  });
}
