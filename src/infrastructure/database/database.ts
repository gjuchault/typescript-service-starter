import { createPool, type DatabasePool, sql } from "slonik";
import type { Config } from "../config/config.ts";
import type { PackageJson } from "../../packageJson.ts";
import { createLogger } from "../logger/logger.ts";
import { z } from "zod";

export type Database = DatabasePool;

export async function createDatabase({
	config,
	packageJson,
}: {
	config: Pick<
		Config,
		| "logLevel"
		| "databaseIdleTimeout"
		| "databaseMaximumPoolSize"
		| "databaseStatementTimeout"
		| "databaseUrl"
	>;
	packageJson: Pick<PackageJson, "name">;
}) {
	const logger = createLogger("database", { packageJson, config });

	logger.debug("connecting to database...");

	const pool = await createPool(config.databaseUrl, {
		captureStackTrace: false,
		statementTimeout: config.databaseStatementTimeout,
		idleTimeout: config.databaseIdleTimeout,
		maximumPoolSize: config.databaseMaximumPoolSize,
	});

	await pool.query(sql.type(z.unknown())`select 1`);

	logger.info("connected to database");

	return pool;
}
