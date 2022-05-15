import Redis from "ioredis";
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

  return telemetry.startSpan(
    "redis.connect",
    getSpanOptions({ redis }),
    async () => {
      logger.debug(`Connecting to redis...`);

      await redis.echo("1");

      logger.info(`Connected to redis`);

      return redis;
    }
  );
}
