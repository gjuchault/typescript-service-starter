import { createHttpTerminator } from "http-terminator";
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";
import type { HttpServer } from "../http-server/http-server.ts";
import { createLogger } from "../logger/logger.ts";
import ms from "ms";
import { promiseWithTimeout } from "../../helpers/promise-with-timeout.ts";

let isShuttingDown = false;
const gracefulShutdownTimeout = ms("20s");

export async function shutdown({
	httpServer,
	packageJson,
	config,
}: {
	httpServer: HttpServer;
	config: Config;
	packageJson: PackageJson;
}) {
	if (isShuttingDown) {
		return;
	}

	isShuttingDown = true;

	const logger = createLogger("shutdown", { config, packageJson });

	logger.info("received termination event, shutting down...");

	const httpTerminator = createHttpTerminator({
		server: httpServer.server,
	});

	async function gracefulShutdown(): Promise<boolean> {
		await httpTerminator.terminate();
		logger.debug("http server shut down");

		return true;
	}

	try {
		await promiseWithTimeout(gracefulShutdownTimeout, gracefulShutdown);

		logger.info(`gracefully shut down service ${config.name}`, {
			version: config.version,
			nodeVersion: process.version,
			arch: process.arch,
			platform: process.platform,
		});
	} catch {
		logger.fatal(
			`could not gracefully shut down service ${config.name} after ${gracefulShutdownTimeout}`,
			{
				version: config.version,
				nodeVersion: process.version,
				arch: process.arch,
				platform: process.platform,
			},
		);
	}

	logger.flush();
}
