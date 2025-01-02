import { Redis } from "ioredis";
import { Worker } from "bullmq";
import { type Config, config } from "./infrastructure/config/config.ts";
import { createLogger } from "./infrastructure/logger/logger.ts";
import { type PackageJson, packageJson } from "./packageJson.ts";
import isMain from "is-main";
import { asyncExitHook } from "exit-hook";
import ms from "ms";
import { shutdown } from "./infrastructure/shutdown/shutdown.ts";

async function startWorker(
	{ queueName }: { queueName: string },
	{ config, packageJson }: { config: Config; packageJson: PackageJson },
): Promise<{ worker: Worker | undefined; workerShutdown(): Promise<void> }> {
	const name = `${packageJson.name}-task-scheduling-${queueName}`;
	const logger = createLogger("worker", { config, packageJson });

	if (config.redisUrl === undefined) {
		return {
			worker: undefined,
			async workerShutdown() {
				/* no-op */
			},
		};
	}

	logger.info("starting worker...");

	const worker = new Worker(
		name,
		async (job: unknown) => {
			logger.debug(`Worker ${worker.id} starting job`, {
				job,
			});

			await Promise.resolve();
		},
		{
			connection: new Redis(config.redisUrl, {
				connectTimeout: 500,
				maxRetriesPerRequest: null,
			}),
		},
	);

	await worker.waitUntilReady();

	logger.info("worker started", { queueName });

	worker.on("failed", (job, error) => {
		logger.debug(`Worker ${worker.id} failed`, {
			error,
			...(job === undefined ? {} : job.toJSON()),
		});
	});

	worker.on("completed", (job) => {
		logger.debug(`Worker ${worker.id} completed`, {
			...job.toJSON(),
		});
	});

	async function workerShutdown() {
		await shutdown({
			worker,
			cache: undefined,
			database: undefined,
			taskScheduling: undefined,
			config,
			packageJson,
		});
	}

	return { worker, workerShutdown };
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
