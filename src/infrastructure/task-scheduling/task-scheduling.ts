import { type Job, PgBoss, type SendOptions } from "pg-boss";
import { type PrimitiveValueExpression, sql } from "slonik";
import { gen, unsafeFlowOrThrow } from "ts-flowgen";
import * as z from "zod";
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";
import type { Database } from "../database/database.ts";
import { createLogger } from "../logger/logger.ts";
import type { Telemetry } from "../telemetry/telemetry.ts";

const rawQueryType = sql.unsafe`select 1`.type;

type TaskSchedulingSetupError = {
	name: "taskSchedulingSetupError";
	error: unknown;
};
function taskSchedulingSetupError(error: unknown): TaskSchedulingSetupError {
	return { name: "taskSchedulingSetupError", error };
}

type TaskSchedulingSendError = {
	name: "taskSchedulingSendError";
	error: unknown;
};
function taskSchedulingSendError(error: unknown): TaskSchedulingSendError {
	return { name: "taskSchedulingSendError", error };
}

export interface TaskScheduling {
	stop(): AsyncGenerator<void, void>;
	work<Payload>(
		name: string,
		schema: z.ZodType<Payload>,
		handler: (job: Job<Payload>) => AsyncGenerator<unknown, void>,
	): AsyncGenerator<unknown, string>;
	sendInTransaction(
		tx: Database,
		data: object,
		options: SendOptions,
	): AsyncGenerator<TaskSchedulingSendError, void>;
}

export async function* createTaskScheduling(
	{ queueName }: { queueName: string },
	{
		telemetry,
		packageJson,
		config,
	}: {
		telemetry: Telemetry;
		config: Pick<Config, "logLevel" | "databaseUrl">;
		packageJson: Pick<PackageJson, "name">;
	},
): AsyncGenerator<TaskSchedulingSetupError, TaskScheduling> {
	const span = telemetry.startSpan({
		spanName:
			"infrastructure/task-scheduling/task-scheduling@createTaskScheduling",
	});

	const logger = createLogger("task-scheduling", { config, packageJson });

	const name = `${packageJson.name}-task-scheduling-${queueName}`;

	logger.debug({ queueName: name }, "creating queue...");

	const boss = new PgBoss({ connectionString: config.databaseUrl });

	boss.on("error", (error) => logger.error(error, "error"));
	boss.on("stopped", () =>
		logger.debug({ queueName: name }, "task scheduling stopped"),
	);

	yield* gen(() => boss.start(), taskSchedulingSetupError)();
	yield* gen(() => boss.createQueue(name), taskSchedulingSetupError)();

	logger.info({ queueName: name }, "created queue");

	span.end();

	logger.info({ queueName: name }, "task scheduling created");

	return {
		stop: gen(() => boss.stop()),
		work: async function* (name, schema, handler) {
			return yield* gen(() =>
				boss.work(name, {}, async (jobs) => {
					for (const job of jobs) {
						await unsafeFlowOrThrow(() =>
							handler({ ...job, data: schema.parse(job.data) }),
						);
					}
				}),
			)();
		},
		sendInTransaction: async function* (
			tx: Database,
			data: object,
			options: SendOptions,
		): AsyncGenerator<TaskSchedulingSendError, void> {
			yield* gen(
				() =>
					boss.send(name, data, {
						...options,
						db: {
							async executeSql(sql, values) {
								logger.info({ name, data }, "inserting job in transaction");
								const rows = await unsafeFlowOrThrow(() =>
									tx.any({
										parser: z.any(),
										// biome-ignore lint/suspicious/noExplicitAny: we are creating a raw query
										type: rawQueryType as any,
										sql,
										values: (values ??
											[]) as readonly PrimitiveValueExpression[],
									}),
								);

								// convert from readonly to mutable array
								return { rows: [...rows] };
							},
						},
					}),
				taskSchedulingSendError,
			)();
		},
	};
}
