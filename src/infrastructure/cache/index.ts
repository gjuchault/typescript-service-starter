import { default as Redis } from "ioredis";
import ms from "ms";
import { promiseWithTimeout } from "../../helpers/promiseTimeout";
import { createLogger } from "../logger";
import type { Telemetry } from "../telemetry";
import { getSpanOptions } from "../telemetry/instrumentations/ioredis";

interface Dependencies {
  url: string;
  telemetry: Telemetry;
}

export type Cache = Redis;

export async function createCacheStorage({
  url,
  telemetry,
}: Dependencies): Promise<Cache> {
  const logger = createLogger("redis");

  const redis = new Redis(url, {});

  redis.on("error", (error) => {
    // these will be spamming quite a log stderr
    if (error.code === "ECONNREFUSED") {
      return;
    }

    logger.error("redis error", { error });
  });

  return telemetry.startSpan("redis.connect", getSpanOptions(url), async () => {
    logger.debug("connecting to redis...");

    try {
      await promiseWithTimeout(ms("2s"), () => redis.echo("1"));
    } catch (error) {
      logger.error("redis connection error", { error });
      throw error;
    }

    logger.info("connected to redis");

    return redis;
  });
}
