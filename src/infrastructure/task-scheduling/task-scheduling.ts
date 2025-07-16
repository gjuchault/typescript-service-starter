import PgBoss from "pg-boss";
import { sql } from "slonik";
import { flow, gen } from "ts-flowgen";
import * as z from "zod";
import { flowOrThrow, unwrap } from "../../helpers/result.ts";
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
		handler: (job: PgBoss.Job<Payload>) => AsyncGenerator<unknown, void>,
	): AsyncGenerator<unknown, string>;
	sendInTransaction(
		tx: Database,
		data: object,
		options: PgBoss.SendOptions,
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

	logger.debug("creating queue...", { queueName: name });

	const boss = new PgBoss({ connectionString: config.databaseUrl });

	boss.on("error", (error) => logger.error("error", error));
	boss.on("stopped", () =>
		logger.debug("task scheduling stopped", { queueName: name }),
	);

	yield* gen(() => boss.start(), taskSchedulingSetupError)();
	yield* gen(() => boss.createQueue(name), taskSchedulingSetupError)();

	logger.info("created queue", { queueName: name });

	span.end();

	logger.info("task scheduling created", { queueName: name });

	return {
		stop: gen(() => boss.stop()),
		work: async function* (name, schema, handler) {
			return yield* gen(() =>
				boss.work(name, {}, async (jobs) => {
					for (const job of jobs) {
						await flowOrThrow(() =>
							handler({ ...job, data: schema.parse(job.data) }),
						);
					}
				}),
			)();
		},
		sendInTransaction: async function* (
			tx: Database,
			data: object,
			options: PgBoss.SendOptions,
		): AsyncGenerator<TaskSchedulingSendError, void> {
			yield* gen(
				() =>
					boss.send(name, data, {
						...options,
						db: {
							async executeSql(sql, values) {
								logger.info("inserting job in transaction", { name, data });
								const rows = await flowOrThrow(() =>
									tx.any({
										parser: z.any(),
										// biome-ignore lint/suspicious/noExplicitAny: we are creating a raw query
										type: rawQueryType as any,
										sql,
										values,
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
