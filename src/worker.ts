import { pid } from "node:process";
import { asyncExitHook } from "exit-hook";
import isMain from "is-main";
import ms from "ms";
import type PgBoss from "pg-boss";
import { type Config, config } from "./infrastructure/config/config.ts";
import { createLogger } from "./infrastructure/logger/logger.ts";
import { shutdown } from "./infrastructure/shutdown/shutdown.ts";
import { createTaskScheduling } from "./infrastructure/task-scheduling/task-scheduling.ts";
import { createTelemetry } from "./infrastructure/telemetry/telemetry.ts";
import { type PackageJson, packageJson } from "./packageJson.ts";

async function startWorker(
	{ queueName }: { queueName: string },
	{ config, packageJson }: { config: Config; packageJson: PackageJson },
): Promise<{ worker: PgBoss | undefined; workerShutdown(): Promise<void> }> {
	const telemetry = createTelemetry({ config, packageJson });

	const span = telemetry.startSpan({
		spanName: "worker@startWorker",
		options: { root: true },
	});

	const name = `${packageJson.name}-task-scheduling-${queueName}`;
	const logger = createLogger("worker", { config, packageJson });

	logger.info("starting worker...");

	const taskScheduling = await createTaskScheduling(
		{ queueName: "jobs" },
		{ telemetry, config, packageJson },
	);

	await taskScheduling.work(name, async ([job]) => {
		logger.debug(`process ${pid} starting job`, {
			job,
		});

		await Promise.resolve();

		logger.debug(`process ${pid} completed job`, {
			job,
		});
	});

	logger.info("worker started", { queueName });

	async function workerShutdown() {
		await shutdown({
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
	const { workerShutdown } = await startWorker(
		{ queueName: "jobs" },
		{
			config,
			packageJson,
		},
	);

	asyncExitHook(async () => await workerShutdown(), { wait: ms("5s") });
}
