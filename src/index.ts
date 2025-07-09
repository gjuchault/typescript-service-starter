import { asyncExitHook } from "exit-hook";
import { isMain } from "is-main";
import ms from "ms";
import { createCacheStorage } from "./infrastructure/cache/cache.ts";
import { type Config, config } from "./infrastructure/config/config.ts";
import { createDatabase } from "./infrastructure/database/database.ts";
import {
	createHttpServer,
	type HttpServer,
} from "./infrastructure/http-server/http-server.ts";
import { createLogger, type Logger } from "./infrastructure/logger/logger.ts";
import { shutdown } from "./infrastructure/shutdown/shutdown.ts";
import { createTaskScheduling } from "./infrastructure/task-scheduling/task-scheduling.ts";
import { createTelemetry } from "./infrastructure/telemetry/telemetry.ts";
import { type PackageJson, packageJson } from "./packageJson.ts";

export async function startApp({
	config,
	packageJson,
}: {
	config: Config;
	packageJson: PackageJson;
}): Promise<{
	appShutdown(): Promise<void>;
	httpServer: HttpServer;
	logger: Logger;
}> {
	const logger = createLogger("app", { config, packageJson });
	logger.info("starting app...");

	const telemetry = createTelemetry({ config, packageJson });

	return await telemetry.startSpanWith(
		{
			spanName: "index@startApp",
			options: { root: true },
		},
		async () => {
			const cache = await createCacheStorage({
				telemetry,
				config,
				packageJson,
			});
			const database = await createDatabase({
				telemetry,
				config,
				packageJson,
			});
			const taskScheduling =
				cache !== undefined
					? await createTaskScheduling(
							{ queueName: "jobs" },
							{ telemetry, config, cache, packageJson },
						)
					: undefined;

			const httpServer = await createHttpServer({
				telemetry,
				database,
				cache,
				config,
				packageJson,
			});

			async function appShutdown() {
				await shutdown({
					httpServer,
					worker: undefined,
					telemetry,
					cache,
					taskScheduling,
					database,
					config,
					packageJson,
				});
			}

			return { httpServer, logger, appShutdown };
		},
	);
}

if (isMain(import.meta)) {
	const { httpServer, appShutdown } = await startApp({
		config,
		packageJson,
	});

	await httpServer.listen({
		host: config.httpAddress,
		port: config.httpPort,
	});

	asyncExitHook(async () => await appShutdown(), { wait: ms("5s") });
	// docker custom
	process.on("SIGINT", async () => await appShutdown());
	process.on("SIGTERM", async () => await appShutdown());
}
