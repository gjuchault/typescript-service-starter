import { default as Redis } from "ioredis";
import { config } from "../../config";
import { createLogger } from "../logger";
import type { Telemetry } from "../telemetry";
import { getSpanOptions } from "../telemetry/instrumentations/ioredis";

interface Dependencies {
  telemetry: Telemetry;
}

export type Cache = Redis;

export async function createCacheStorage({
  telemetry,
}: Dependencies): Promise<Cache> {
  const logger = createLogger("redis");

  const redis = new Redis(config.redisUrl, {});

  return telemetry.startSpan("redis.connect", getSpanOptions(), async () => {
    logger.debug(`connecting to redis...`);

    await redis.echo("1");

    logger.info(`connected to redis`);

    return redis;
  });
}
