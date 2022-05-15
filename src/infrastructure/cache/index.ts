import { default as Redis } from "ioredis";
import * as config from "../../config";
import { createLogger } from "../logger";
import type { Telemetry } from "../telemetry";
import { getSpanOptions } from "../telemetry/instrumentations/ioredis";

interface Dependencies {
  telemetry: Telemetry;
}

export async function createCacheStorage({
  telemetry,
}: Dependencies): Promise<Redis> {
  const logger = createLogger("redis");

  const redis = new Redis(config.redisUrl, {});

  return telemetry.startSpan("redis.connect", getSpanOptions(), async () => {
    logger.debug(`connecting to redis...`);

    await redis.echo("1");

    logger.info(`connected to redis`);

    return redis;
  });
}
