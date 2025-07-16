import { GlideClient } from "@valkey/valkey-glide";
import ms from "ms";
import { gen, timeout } from "ts-flowgen";
import {
	type WrappedObjectMethods,
	wrapObjectMethods,
} from "../../helpers/result.ts";
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";
import { createLogger } from "../logger/logger.ts";
import type { Telemetry } from "../telemetry/telemetry.ts";

interface Dependencies {
	telemetry: Telemetry;
	config: Pick<Config, "valkeyUrl" | "logLevel">;
	packageJson: Pick<PackageJson, "name">;
}

export interface ValkeyError {
	name: "valkeyError";
	error: unknown;
}

export type Cache = WrappedObjectMethods<GlideClient, ValkeyError> & {
	unwrapped: GlideClient;
};

export async function* createCacheStorage({
	telemetry,
	config,
	packageJson,
}: Dependencies) {
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

	async function connectToValkey(): Promise<GlideClient> {
		return await GlideClient.createClient({
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
	}

	const valkey = yield* timeout(ms("2s"), gen(connectToValkey)())();

	logger.info("connected to valkey");

	span.end();

	return wrapObjectMethods(
		valkey,
		(error) => ({ name: "valkeyError", error }) satisfies ValkeyError,
	);
}
