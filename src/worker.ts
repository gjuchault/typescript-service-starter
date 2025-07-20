import { pid } from "node:process";
import { asyncExitHook } from "exit-hook";
import isMain from "is-main";
import ms from "ms";
import { noop, unsafeFlowOrThrow } from "ts-flowgen";
import * as z from "zod";
import { type Config, config } from "./infrastructure/config/config.ts";
import { createLogger } from "./infrastructure/logger/logger.ts";
import { shutdown } from "./infrastructure/shutdown/shutdown.ts";
import { createTaskScheduling } from "./infrastructure/task-scheduling/task-scheduling.ts";
import { createTelemetry } from "./infrastructure/telemetry/telemetry.ts";
import { type PackageJson, packageJson } from "./packageJson.ts";

async function* startWorker(
	{ queueName }: { queueName: string },
	{ config, packageJson }: { config: Config; packageJson: PackageJson },
) {
	const telemetry = createTelemetry({ config, packageJson });

	const span = telemetry.startSpan({
		spanName: "worker@startWorker",
		options: { root: true },
	});

	const name = `${packageJson.name}-task-scheduling-${queueName}`;
	const logger = createLogger("worker", { config, packageJson });

	logger.info("starting worker...");

	const taskScheduling = yield* createTaskScheduling(
		{ queueName: "jobs" },
		{ telemetry, config, packageJson },
	);

	yield* taskScheduling.work(name, z.object({}), async function* (job) {
		logger.debug(`process ${pid} starting job`, {
			job,
		});

		yield* noop();

		logger.debug(`process ${pid} completed job`, {
			job,
		});
	});

	logger.info("worker started", { queueName });

	async function* workerShutdown() {
		return yield* shutdown({
			cache: undefined,
			database: undefined,
			taskScheduling,
			telemetry,
			config,
			packageJson,
		});
	}

	span.end();

	return { worker: taskScheduling, workerShutdown };
}

if (isMain(import.meta)) {
	const { workerShutdown } = await unsafeFlowOrThrow(() =>
		startWorker(
			{ queueName: "jobs" },
			{
				config,
				packageJson,
			},
		),
	);

	const shutdown = () => unsafeFlowOrThrow(() => workerShutdown());

	asyncExitHook(shutdown, { wait: ms("5s") });
	// docker custom
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}
