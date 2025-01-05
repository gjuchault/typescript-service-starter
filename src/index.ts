import { asyncExitHook } from "exit-hook";
import { isMain } from "is-main";
import ms from "ms";
import { createCacheStorage } from "./infrastructure/cache/cache.ts";
import { type Config, config } from "./infrastructure/config/config.ts";
import { createDatabase } from "./infrastructure/database/database.ts";
import {
	type HttpServer,
	createHttpServer,
} from "./infrastructure/http-server/http-server.ts";
import { type Logger, createLogger } from "./infrastructure/logger/logger.ts";
import { shutdown } from "./infrastructure/shutdown/shutdown.ts";
import { createTaskScheduling } from "./infrastructure/task-scheduling/task-scheduling.ts";
import { type PackageJson, packageJson } from "./packageJson.ts";

export async function startApp({
	config,
	packageJson,
}: { config: Config; packageJson: PackageJson }): Promise<{
	appShutdown(): Promise<void>;
	httpServer: HttpServer;
	logger: Logger;
}> {
	const logger = createLogger("app", { config, packageJson });

	logger.info("starting app...");

	const cache = await createCacheStorage({ config, packageJson });
	const database = await createDatabase({ config, packageJson });
	const taskScheduling =
		cache !== undefined
			? await createTaskScheduling(
					{ queueName: "jobs" },
					{ config, cache, packageJson },
				)
			: undefined;

	const httpServer = await createHttpServer({
		database,
		cache,
		config,
		packageJson,
	});

	async function appShutdown() {
		await shutdown({
			httpServer,
			worker: undefined,
			cache,
			taskScheduling,
			database,
			config,
			packageJson,
		});
	}

	return { httpServer, logger, appShutdown };
}

if (isMain(import.meta)) {
	const { appShutdown } = await startApp({
		config,
		packageJson,
	});

	asyncExitHook(async () => await appShutdown(), { wait: ms("5s") });
}
