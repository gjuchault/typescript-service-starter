import { asyncExitHook } from "exit-hook";
import { isMain } from "is-main";
import ms from "ms";
import { type Config, config } from "./infrastructure/config/config.ts";
import { createDatabase } from "./infrastructure/database/database.ts";
import {
	type HttpServer,
	createHttpServer,
} from "./infrastructure/http-server/http-server.ts";
import { type Logger, createLogger } from "./infrastructure/logger/logger.ts";
import { shutdown } from "./infrastructure/shutdown/shutdown.ts";
import { type PackageJson, packageJson } from "./packageJson.ts";
import { createCacheStorage } from "./infrastructure/cache/cache.ts";

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
	const httpServer = await createHttpServer({ cache, config, packageJson });

	async function appShutdown() {
		await shutdown({ httpServer, cache, database, config, packageJson });
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
