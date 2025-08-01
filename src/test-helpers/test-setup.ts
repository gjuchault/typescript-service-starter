import { randomUUID } from "node:crypto";
import { sql } from "slonik";
import { gen, never } from "ts-flowgen";
import * as z from "zod";
import { startApp } from "../index.ts";
import { config } from "../infrastructure/config/config.ts";
import type { Database } from "../infrastructure/database/database.ts";
import type { HttpServer } from "../infrastructure/http-server/http-server.ts";
import { packageJson } from "../packageJson.ts";
import { templateDbName } from "./db-initial-setup.ts";
import { getDatabase, replaceDatabaseInUrl } from "./get-database.ts";

export type SetupResult = {
	database: Database;
	httpServer: HttpServer;
	cleanup: () => AsyncGenerator<unknown, void>;
};

export async function* setup(): AsyncGenerator<unknown, SetupResult> {
	const postgresInstance = yield* getDatabase("postgres");

	const uniqueDbId = BigInt(`0x${randomUUID().replaceAll("-", "")}`)
		.toString(36)
		.substring(0, 8);
	const testDbName = `${templateDbName}-${uniqueDbId}`;

	yield* postgresInstance.query(
		sql.type(
			z.unknown(),
		)`create database ${sql.identifier([testDbName])} template ${sql.identifier([templateDbName])}`,
	);

	if (postgresInstance.end === undefined) {
		yield new Error(
			"postgresInstance.end is undefined - did you pass a transaction?",
		);
		return never();
	}

	yield* postgresInstance.end();

	const database = yield* getDatabase(testDbName);

	const { httpServer, appShutdown } = yield* startApp({
		config: {
			...config,
			databaseUrl: replaceDatabaseInUrl(config.databaseUrl, testDbName),
			logLevel: "warn",
		},
		packageJson,
	});

	// Wait for the server to be ready
	yield* gen(async () => await httpServer.ready())();

	async function* cleanup() {
		if (database.end === undefined) {
			yield new Error(
				"database.end is undefined - did you pass a transaction?",
			);
			return never();
		}

		yield* database.end();
		yield* appShutdown();

		const dbInstance = yield* getDatabase("postgres");
		yield* dbInstance.query(
			sql.type(
				z.unknown(),
			)`drop database if exists ${sql.identifier([testDbName])}`,
		);
		if (dbInstance.end === undefined) {
			yield new Error(
				"postgresInstance.end is undefined - did you pass a transaction?",
			);
			return never();
		}
		yield* dbInstance.end();
	}

	return { database, httpServer, cleanup };
}
