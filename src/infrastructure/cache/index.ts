import { setTimeout } from "node:timers/promises";
import { default as Redis } from "ioredis";
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

  return telemetry.startSpan("redis.connect", getSpanOptions(url), async () => {
    logger.debug("connecting to redis...");

    await redis.echo("1");

    logger.info("connected to redis");

    return redis;
  });
}
