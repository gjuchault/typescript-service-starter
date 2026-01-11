import { asyncExitHook } from "exit-hook";
import ms from "ms";
import { errdefer, flow, timeout, unsafeFlowOrThrow } from "ts-flowgen";
import { createCacheStorage } from "./infrastructure/cache/cache.ts";
import { type Config, config } from "./infrastructure/config/config.ts";
import { createDatabase } from "./infrastructure/database/database.ts";
import { createHttpServer } from "./infrastructure/http-server/http-server.ts";
import { createLogger } from "./infrastructure/logger/logger.ts";
import { shutdown } from "./infrastructure/shutdown/shutdown.ts";
import { createTaskScheduling } from "./infrastructure/task-scheduling/task-scheduling.ts";
import { createTelemetry } from "./infrastructure/telemetry/telemetry.ts";
import { type PackageJson, packageJson } from "./packageJson.ts";

import "temporal-polyfill/global";

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
		yield* errdefer(async () => {
			if (cache !== undefined) {
				await flow(cache?.close);
			}
		});

		const database = yield* createDatabase({
			telemetry,
			config,
			packageJson,
		});
		yield* errdefer(async () => {
			if (database.end !== undefined) {
				await flow(database.end);
			}
		});

		const taskScheduling = yield* createTaskScheduling(
			{ queueName: "jobs" },
			{ telemetry, config, packageJson },
		);
		yield* errdefer(async () => {
			await flow(taskScheduling.stop);
		});

		const httpServer = yield* createHttpServer({
			telemetry,
			database,
			cache,
			config,
			packageJson,
			taskScheduling,
		});
		yield* errdefer(async () => {
			await httpServer.close();
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

if (import.meta.main) {
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
