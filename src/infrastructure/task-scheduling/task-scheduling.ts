import { Queue } from "bullmq";

import ms from "ms";
import type { PackageJson } from "../../packageJson.ts";
import type { Cache } from "../cache/cache.ts";
import type { Config } from "../config/config.ts";
import { createLogger } from "../logger/logger.ts";
import type { Telemetry } from "../telemetry/telemetry.ts";

export type TaskScheduling<
	DataTypeOrJob = unknown,
	DefaultResultType = unknown,
> = Queue<DataTypeOrJob, DefaultResultType>;

export async function createTaskScheduling<
	DataTypeOrJob = unknown,
	DefaultResultType = unknown,
>(
	{ queueName }: { queueName: string },
	{
		telemetry,
		packageJson,
		config,
		cache,
	}: {
		telemetry: Telemetry;
		config: Pick<Config, "logLevel">;
		packageJson: Pick<PackageJson, "name">;
		cache: Cache;
	},
): Promise<TaskScheduling<DataTypeOrJob, DefaultResultType>> {
	return await telemetry.startActiveSpan("createTaskScheduling", async () => {
		const logger = createLogger("task-scheduling", { config, packageJson });

		const name = `${packageJson.name}-task-scheduling-${queueName}`;

		logger.debug("creating queue...", {
			queueName: name,
		});

		const queueConnection = cache.duplicate({ maxRetriesPerRequest: null });
		const queue = new Queue<DataTypeOrJob, DefaultResultType>(name, {
			connection: queueConnection,
			defaultJobOptions: {
				removeOnComplete: {
					age: ms("7days"),
					count: 1000,
				},
				removeOnFail: {
					count: 50_000,
				},
			},
		});

		await queue.waitUntilReady();

		logger.info("created queue", { queueName: name });

		return queue;
	});
}
