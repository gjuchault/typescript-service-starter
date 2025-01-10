import { SpanKind } from "@opentelemetry/api";
import {
	ATTR_DB_NAMESPACE,
	ATTR_DB_OPERATION_NAME,
	ATTR_DB_QUERY_TEXT,
	ATTR_DB_SYSTEM,
	ATTR_SERVER_ADDRESS,
	ATTR_SERVER_PORT,
	DB_SYSTEM_VALUE_POSTGRESQL,
} from "@opentelemetry/semantic-conventions/incubating";
import { type CommonQueryMethods, createPool, sql } from "slonik";
import { z } from "zod";
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";
import { createLogger } from "../logger/logger.ts";
import type { Span, Telemetry } from "../telemetry/telemetry.ts";

// not using Database type from slonik so we have a mockable Record type instead of an interface
export type Database = CommonQueryMethods & { end(): Promise<void> };

export async function createDatabase({
	telemetry,
	config,
	packageJson,
}: {
	telemetry: Telemetry;
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
	return await telemetry.startSpanWith(
		{ spanName: "infrastructure/database/database@createDatabase" },
		async () => {
			const logger = createLogger("database", { packageJson, config });

			logger.debug("connecting to database...");

			const spanByQueryId = new Map<string, Span>();

			const pool = await createPool(config.databaseUrl, {
				captureStackTrace: false,
				statementTimeout: config.databaseStatementTimeout,
				idleTimeout: config.databaseIdleTimeout,
				maximumPoolSize: config.databaseMaximumPoolSize,
				interceptors: [
					{
						beforeQueryExecution(queryContext, query) {
							const span = telemetry.startSpan({
								spanName: "infrastructure/database/database@query",
								options: {
									kind: SpanKind.CLIENT,
									attributes: {
										...getCommonSpanOptions(config.databaseUrl),
										[ATTR_DB_OPERATION_NAME]: parseNormalizedOperationName(
											query.sql,
										),
										[ATTR_DB_QUERY_TEXT]: query.sql,
									},
								},
							});

							spanByQueryId.set(queryContext.queryId, span);

							return null;
						},
						afterQueryExecution(queryContext, query) {
							const span = spanByQueryId.get(queryContext.queryId);

							if (span === undefined) {
								logger.warn("missing span for query", {
									queryContext,
									query,
								});

								return null;
							}

							span.end();
							return null;
						},
					},
				],
			});

			await pool.query(sql.type(z.unknown())`select 1`);

			logger.info("connected to database");

			return pool;
		},
	);
}

function getCommonSpanOptions(databaseUrlAsString: string) {
	const databaseUrl = new URL(databaseUrlAsString);
	databaseUrl.password = "";

	return {
		[ATTR_DB_SYSTEM]: DB_SYSTEM_VALUE_POSTGRESQL,
		[ATTR_DB_NAMESPACE]: databaseUrl.pathname.slice(1),
		[ATTR_SERVER_ADDRESS]: databaseUrl.hostname,
		[ATTR_SERVER_PORT]: databaseUrl.port,
	};
}

function parseNormalizedOperationName(queryText: string) {
	const indexOfFirstSpace = queryText.indexOf(" ");
	let sqlCommand =
		indexOfFirstSpace === -1
			? queryText
			: queryText.slice(0, indexOfFirstSpace);
	sqlCommand = sqlCommand.toUpperCase();

	// Handle query text being "COMMIT;", which has an extra semicolon before the space.
	return sqlCommand.endsWith(";") ? sqlCommand.slice(0, -1) : sqlCommand;
}
