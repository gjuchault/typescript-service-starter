import { createHttpTerminator } from "http-terminator";
import ms from "ms";
import { gen, never, timeout } from "ts-flowgen";
import type { PackageJson } from "../../packageJson.ts";
import type { Cache } from "../cache/cache.ts";
import type { Config } from "../config/config.ts";
import type { Database } from "../database/database.ts";
import type { HttpServer } from "../http-server/http-server.ts";
import { createLogger } from "../logger/logger.ts";
import type { TaskScheduling } from "../task-scheduling/task-scheduling.ts";
import type { Telemetry } from "../telemetry/telemetry.ts";

let isShuttingDown = false;
const gracefulShutdownTimeout = ms("20s");

export async function* shutdown(dependencies: {
	database: Database | undefined;
	telemetry: Telemetry | undefined;
	httpServer?: HttpServer;
	taskScheduling: TaskScheduling;
	cache: Cache | undefined;
	config: Pick<Config, "logLevel">;
	packageJson: Pick<PackageJson, "name" | "version">;
}): AsyncGenerator<unknown, void> {
	if (isShuttingDown) {
		return;
	}

	isShuttingDown = true;

	const logger = createLogger("shutdown", {
		config: dependencies.config,
		packageJson: dependencies.packageJson,
	});

	logger.info("received termination event, shutting down...");

	let httpTerminator: { terminate: () => Promise<void> } | undefined;

	if ("httpServer" in dependencies && dependencies.httpServer !== undefined) {
		if (dependencies.httpServer.server.listening) {
			httpTerminator = createHttpTerminator({
				server: dependencies.httpServer.server,
			});
		} else {
			httpTerminator = { terminate: dependencies.httpServer.close };
		}
	}

	async function* gracefulShutdown(): AsyncGenerator<unknown, boolean> {
		yield* dependencies.taskScheduling.stop();
		logger.debug("task scheduling shut down");

		if (httpTerminator !== undefined) {
			yield* gen(() => httpTerminator.terminate())();
			logger.debug("http server shut down");
		}

		if (dependencies.database !== undefined) {
			if (dependencies.database.end === undefined) {
				yield new Error(
					"database.end is undefined - did you pass a transaction?",
				);
				return never();
			}

			yield* dependencies.database.end();
			logger.debug("database shut down");
		}

		if (dependencies.cache !== undefined) {
			yield* dependencies.cache.close();
			logger.debug("cache shut down");
		}

		if (dependencies.telemetry !== undefined) {
			yield* dependencies.telemetry.shutdown();
			logger.debug("telemetry shut down");
		}

		return true;
	}

	try {
		yield* timeout(gracefulShutdownTimeout, gracefulShutdown())();

		logger.info(
			`gracefully shut down service ${dependencies.packageJson.name}`,
			{
				version: dependencies.packageJson.version,
				nodeVersion: process.version,
				arch: process.arch,
				platform: process.platform,
			},
		);
	} catch (error) {
		logger.fatal(
			`could not gracefully shut down service ${dependencies.packageJson.name} after ${gracefulShutdownTimeout}`,
			{
				version: dependencies.packageJson.version,
				nodeVersion: process.version,
				arch: process.arch,
				platform: process.platform,
				error,
			},
		);
	}

	logger.flush();
}
