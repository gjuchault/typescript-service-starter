import { GlideClient } from "@valkey/valkey-glide";
import ms from "ms";
import { promiseWithTimeout } from "../../helpers/promise-with-timeout.ts";
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";
import { createLogger } from "../logger/logger.ts";
import type { Telemetry } from "../telemetry/telemetry.ts";

interface Dependencies {
	telemetry: Telemetry;
	config: Pick<Config, "valkeyUrl" | "logLevel">;
	packageJson: Pick<PackageJson, "name">;
}

export type Cache = GlideClient;

export async function createCacheStorage({
	telemetry,
	config,
	packageJson,
}: Dependencies): Promise<Cache | undefined> {
	const span = telemetry.startSpan({
		spanName: "infrastructure/cache/cache@createCacheStorage",
	});

	const logger = createLogger("valkey", { config, packageJson });

	if (config.valkeyUrl === undefined) {
		logger.info("skipping cache connection");
		return undefined;
	}

	const url = new URL(config.valkeyUrl);

	logger.debug("connecting to valkey...");

	let valkey: GlideClient;

	try {
		valkey = await GlideClient.createClient({
			addresses: [
				{
					host: url.hostname,
					port: url.port?.length > 0 ? Number(url.port) : 6379,
				},
			],
			requestTimeout: 500,
			advancedConfiguration: {
				connectionTimeout: 500,
			},
		});

		await promiseWithTimeout(ms("2s"), () => valkey.echo("1"));
	} catch (error) {
		logger.error("valkey connection error", { error });
		throw error;
	}

	logger.info("connected to valkey");

	span.end();

	return valkey;
}
