import { Redis } from "ioredis";
import ms from "ms";

import { promiseWithTimeout } from "../../helpers/promise-with-timeout.ts";
import { createLogger } from "../logger/logger.ts";
import type { Config } from "../config/config.ts";
import type { PackageJson } from "../../packageJson.ts";

interface Dependencies {
	config: Pick<Config, "redisUrl" | "logLevel">;
	packageJson: Pick<PackageJson, "name">;
}

export type Cache = Redis;

export async function createCacheStorage({
	config,
	packageJson,
}: Dependencies): Promise<Cache | undefined> {
	const logger = createLogger("redis", { config, packageJson });

	if (config.redisUrl === undefined) {
		logger.info("skipping cache connection");
		return undefined;
	}

	const redis = new Redis(config.redisUrl, {
		connectTimeout: 500,
		maxRetriesPerRequest: 1,
	});

	redis.on("error", (error) => {
		if (!isRedisError(error)) {
			throw new Error(error);
		}

		// these will be spamming quite a log stderr
		if (isRedisConnRefusedError(error)) {
			return;
		}

		logger.error("redis error", { error });
	});

	logger.debug("connecting to redis...");

	try {
		await promiseWithTimeout(ms("2s"), () => redis.echo("1"));
	} catch (error) {
		logger.error("redis connection error", { error });
		throw error;
	}

	logger.info("connected to redis");

	return redis;
}

function isRedisError(error: unknown): error is object {
	return typeof error === "object" && error !== null;
}

function isRedisConnRefusedError(error: object): error is { code: string } {
	if ("code" in error) {
		return (error as { code: string }).code === "ECONNREFUSED";
	}

	return false;
}
