import { SpanKind } from "@opentelemetry/api";
import {
	ATTR_DB_NAMESPACE,
	ATTR_DB_OPERATION_NAME,
	ATTR_DB_QUERY_TEXT,
	ATTR_DB_SYSTEM_NAME,
	ATTR_SERVER_ADDRESS,
	ATTR_SERVER_PORT,
} from "@opentelemetry/semantic-conventions";
import { DB_SYSTEM_VALUE_POSTGRESQL } from "@opentelemetry/semantic-conventions/incubating";
import {
	type CommonQueryMethods,
	createPool,
	type PrimitiveValueExpression,
	type QueryResult,
	type QuerySqlToken,
	sql,
} from "slonik";
import type { StreamHandler, StreamResult } from "slonik/dist/types.js";
import { gen, unsafeFlowOrThrow } from "ts-flowgen";
import * as z from "zod";
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";
import { createLogger } from "../logger/logger.ts";
import type { Span, Telemetry } from "../telemetry/telemetry.ts";

type InferStandardSchema<T extends z.ZodType> = NonNullable<
	T["~standard"]["types"]
>["output"];
export interface Database extends Record<string, unknown> {
	any: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		values?: PrimitiveValueExpression[],
	) => AsyncGenerator<DatabaseError, ReadonlyArray<InferStandardSchema<T>>>;
	anyFirst: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		values?: PrimitiveValueExpression[],
	) => AsyncGenerator<
		DatabaseError,
		ReadonlyArray<InferStandardSchema<T>[keyof InferStandardSchema<T>]>
	>;
	exists: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		values?: PrimitiveValueExpression[],
	) => AsyncGenerator<DatabaseError, boolean>;
	many: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		values?: PrimitiveValueExpression[],
	) => AsyncGenerator<DatabaseError, ReadonlyArray<InferStandardSchema<T>>>;
	manyFirst: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		values?: PrimitiveValueExpression[],
	) => AsyncGenerator<
		DatabaseError,
		ReadonlyArray<InferStandardSchema<T>[keyof InferStandardSchema<T>]>
	>;
	maybeOne: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		values?: PrimitiveValueExpression[],
	) => AsyncGenerator<DatabaseError, InferStandardSchema<T> | null>;
	maybeOneFirst: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		values?: PrimitiveValueExpression[],
	) => AsyncGenerator<
		DatabaseError,
		InferStandardSchema<T>[keyof InferStandardSchema<T>] | null
	>;
	one: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		values?: PrimitiveValueExpression[],
	) => AsyncGenerator<DatabaseError, InferStandardSchema<T>>;
	oneFirst: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		values?: PrimitiveValueExpression[],
	) => AsyncGenerator<
		DatabaseError,
		InferStandardSchema<T>[keyof InferStandardSchema<T>]
	>;
	query: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		values?: PrimitiveValueExpression[],
	) => AsyncGenerator<DatabaseError, QueryResult<InferStandardSchema<T>>>;
	stream: <T extends z.ZodType>(
		sql: QuerySqlToken<T>,
		streamHandler: StreamHandler<InferStandardSchema<T>>,
	) => AsyncGenerator<DatabaseError, StreamResult>;
	transaction: <Error, Value>(
		handler: (db: Database) => AsyncGenerator<Error, Value>,
	) => AsyncGenerator<DatabaseError, Value>;

	end: (() => AsyncGenerator<unknown, void>) | undefined;
}

type DatabaseSetupError = { name: "databaseSetupError"; error: unknown };
function databaseSetupError(error: unknown): DatabaseSetupError {
	return { name: "databaseSetupError", error };
}

type DatabaseError = { name: "databaseError"; error: unknown };
function databaseError(error: unknown): DatabaseError {
	return { name: "databaseError", error };
}

export async function* createDatabase({
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
}): AsyncGenerator<DatabaseSetupError | DatabaseError, Database> {
	return yield* telemetry.startSpanWith(
		{ spanName: "infrastructure/database/database@createDatabase" },
		async function* () {
			const logger = createLogger("database", { packageJson, config });

			logger.debug("connecting to database...");

			const spanByQueryId = new Map<string, Span>();

			const pool = yield* gen(createPool, databaseSetupError)(
				config.databaseUrl,
				{
					captureStackTrace: false,
					statementTimeout: config.databaseStatementTimeout,
					idleTimeout: config.databaseIdleTimeout,
					maximumPoolSize: config.databaseMaximumPoolSize,
					interceptors: [
						{
							name: "telemetry",
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
									logger.warn(
										{ queryContext, query },
										"missing span for query",
									);

									return null;
								}

								span.end();
								return null;
							},
						},
					],
				},
			);

			const database = poolWrapper(pool);

			yield* database.query(sql.type(z.unknown())`select 1`);

			logger.info("connected to database");

			return database;
		},
	);
}

function poolWrapper(
	pool: CommonQueryMethods & { end?(): Promise<void> },
): Database {
	return {
		any: gen(pool.any.bind(pool), databaseError),
		anyFirst: gen(pool.anyFirst.bind(pool), databaseError),
		exists: gen(pool.exists.bind(pool), databaseError),
		many: gen(pool.many.bind(pool), databaseError),
		manyFirst: gen(pool.manyFirst.bind(pool), databaseError),
		maybeOne: gen(pool.maybeOne.bind(pool), databaseError),
		maybeOneFirst: gen(pool.maybeOneFirst.bind(pool), databaseError),
		one: gen(pool.one.bind(pool), databaseError),
		oneFirst: gen(pool.oneFirst.bind(pool), databaseError),
		query: gen(pool.query.bind(pool), databaseError),
		stream: gen(pool.stream.bind(pool), databaseError),
		transaction: async function* <Error, Value>(
			handler: (db: Database) => AsyncGenerator<Error, Value>,
		) {
			return yield* gen(
				pool.transaction.bind(pool),
				databaseError,
			)(async (db) => await unsafeFlowOrThrow(() => handler(poolWrapper(db))));
		},
		end: pool.end
			? gen(async () => {
					await pool.end?.();
				}, databaseError)
			: undefined,
	};
}

function getCommonSpanOptions(databaseUrlAsString: string) {
	const databaseUrl = new URL(databaseUrlAsString);
	databaseUrl.password = "";

	return {
		[ATTR_DB_SYSTEM_NAME]: DB_SYSTEM_VALUE_POSTGRESQL,
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
