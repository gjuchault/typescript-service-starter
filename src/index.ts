import { asyncExitHook } from "exit-hook";
import { isMain } from "is-main";
import ms from "ms";
import { timeout, unsafeFlowOrThrow } from "ts-flowgen";
import { createCacheStorage } from "./infrastructure/cache/cache.ts";
import { type Config, config } from "./infrastructure/config/config.ts";
import { createDatabase } from "./infrastructure/database/database.ts";
import { createHttpServer } from "./infrastructure/http-server/http-server.ts";
import { createLogger } from "./infrastructure/logger/logger.ts";
import { shutdown } from "./infrastructure/shutdown/shutdown.ts";
import { createTaskScheduling } from "./infrastructure/task-scheduling/task-scheduling.ts";
import { createTelemetry } from "./infrastructure/telemetry/telemetry.ts";
import { type PackageJson, packageJson } from "./packageJson.ts";

export async function* startApp({
	config,
	packageJson,
}: {
	config: Config;
	packageJson: PackageJson;
}) {
	const logger = createLogger("app", { config, packageJson });
	logger.info("starting app...");

	const telemetry = createTelemetry({ config, packageJson });

	async function* app() {
		const cache = yield* createCacheStorage({
			telemetry,
			config,
			packageJson,
		});

		const database = yield* createDatabase({
			telemetry,
			config,
			packageJson,
		});

		const taskScheduling = yield* createTaskScheduling(
			{ queueName: "jobs" },
			{ telemetry, config, packageJson },
		);

		const httpServer = yield* createHttpServer({
			telemetry,
			database,
			cache,
			config,
			packageJson,
			taskScheduling,
		});

		async function* appShutdown() {
			return yield* shutdown({
				httpServer,
				telemetry,
				cache,
				taskScheduling,
				database,
				config,
				packageJson,
			});
		}

		return { httpServer, logger, appShutdown };
	}

	return yield* telemetry.startSpanWith(
		{
			spanName: "index@startApp",
			options: { root: true },
		},
		() => timeout(ms("10s"), app()),
	);
}

if (isMain(import.meta)) {
	const { httpServer, appShutdown } = await unsafeFlowOrThrow(() =>
		startApp({
			config,
			packageJson,
		}),
	);

	await httpServer.listen({
		host: config.httpAddress,
		port: config.httpPort,
	});

	const shutdown = () => unsafeFlowOrThrow(() => appShutdown());

	asyncExitHook(shutdown, { wait: ms("5s") });
	// docker custom
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}
