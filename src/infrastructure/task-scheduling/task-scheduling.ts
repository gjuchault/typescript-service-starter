import PgBoss from "pg-boss";
import { type CommonQueryMethods, sql } from "slonik";
import * as z from "zod";
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";
import { createLogger } from "../logger/logger.ts";
import type { Telemetry } from "../telemetry/telemetry.ts";

const rawQueryType = sql.unsafe`select 1`.type;

export type TaskScheduling = PgBoss & {
	sendInTransaction(
		tx: CommonQueryMethods,
		data: object,
		options: PgBoss.SendOptions,
	): Promise<void>;
} & {};

export async function createTaskScheduling(
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
): Promise<TaskScheduling> {
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

	await boss.start();

	await boss.createQueue(name);

	logger.info("created queue", { queueName: name });

	span.end();

	Object.defineProperty(boss, "sendInTransaction", {
		configurable: false,
		enumerable: true,
		writable: false,
		value: async function sendInTransaction(
			tx: CommonQueryMethods,
			data: object,
			options: PgBoss.SendOptions,
		) {
			await boss.send(name, data, {
				...options,
				db: {
					async executeSql(sql, values) {
						logger.info("inserting job in transaction", { name, data });
						const rows = await tx.any({
							parser: z.any(),
							// biome-ignore lint/suspicious/noExplicitAny: we are creating a raw query
							type: rawQueryType as any,
							sql,
							values,
						});

						// convert from readonly to mutable array
						return { rows: [...rows] };
					},
				},
			});
		},
	});

	logger.info("task scheduling created", { queueName: name });

	return boss as TaskScheduling;
}
