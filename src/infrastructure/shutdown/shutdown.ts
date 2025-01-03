import type { Worker } from "bullmq";
import { createHttpTerminator } from "http-terminator";
import ms from "ms";
import { promiseWithTimeout } from "../../helpers/promise-with-timeout.ts";
import type { PackageJson } from "../../packageJson.ts";
import type { Cache } from "../cache/cache.ts";
import type { Config } from "../config/config.ts";
import type { Database } from "../database/database.ts";
import type { HttpServer } from "../http-server/http-server.ts";
import { createLogger } from "../logger/logger.ts";
import type { TaskScheduling } from "../task-scheduling/task-scheduling.ts";

let isShuttingDown = false;
const gracefulShutdownTimeout = ms("20s");

export async function shutdown(
	dependencies: {
		database: Database | undefined;
		taskScheduling: TaskScheduling | undefined;
		cache: Cache | undefined;
		config: Pick<Config, "logLevel">;
		packageJson: Pick<PackageJson, "name" | "version">;
	} & ({ httpServer: HttpServer } | { worker: Worker }),
) {
	if (isShuttingDown) {
		return;
	}

	isShuttingDown = true;

	const logger = createLogger("shutdown", {
		config: dependencies.config,
		packageJson: dependencies.packageJson,
	});

	logger.info("received termination event, shutting down...");

	const httpTerminator =
		"httpServer" in dependencies && dependencies.httpServer !== undefined
			? createHttpTerminator({
					server: dependencies.httpServer.server,
				})
			: undefined;

	async function gracefulShutdown(): Promise<boolean> {
		if ("worker" in dependencies && dependencies.worker !== undefined) {
			await dependencies.worker.close();
			logger.debug("worker shut down");
		}

		if (httpTerminator !== undefined) {
			await httpTerminator.terminate();
			logger.debug("http server shut down");
		}

		if (dependencies.database !== undefined) {
			await dependencies.database.end();
			logger.debug("database shut down");
		}

		if (dependencies.taskScheduling !== undefined) {
			await dependencies.taskScheduling.close();
			logger.debug("task scheduling down");
		}

		if (dependencies.cache !== undefined) {
			await dependencies.cache.quit();
			logger.debug("cache shut down");
		}

		return true;
	}

	try {
		await promiseWithTimeout(gracefulShutdownTimeout, gracefulShutdown);

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
