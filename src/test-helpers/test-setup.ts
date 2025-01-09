import { randomUUID } from "node:crypto";
import { sql } from "slonik";
import { config } from "../infrastructure/config/config.ts";
import { getDatabase, replaceDatabaseInUrl } from "./get-database.ts";
import type { Database } from "../infrastructure/database/database.ts";
import { startApp } from "../index.ts";
import { packageJson } from "../packageJson.ts";
import type { HttpServer } from "../infrastructure/http-server/http-server.ts";
import { templateDbName } from "./db-initial-setup.ts";

export type SetupResult = {
	database: Database;
	httpServer: HttpServer;
	cleanup: () => Promise<void>;
};

export async function setup(): Promise<SetupResult> {
	const postgresInstance = await getDatabase("postgres");

	const uniqueDbId = BigInt(`0x${randomUUID().replaceAll("-", "")}`)
		.toString(36)
		.substring(0, 8);
	const testDbName = `${templateDbName}-${uniqueDbId}`;

	// biome-ignore lint/suspicious/noConsoleLog: CLI
	// biome-ignore lint/suspicious/noConsole: CLI
	console.log(
		`creating database ${testDbName} with template ${templateDbName}`,
	);
	await postgresInstance.query(
		sql.unsafe`create database ${sql.identifier([testDbName])} template ${sql.identifier([templateDbName])}`,
	);
	await postgresInstance.end();

	const database = await getDatabase(testDbName);

	// biome-ignore lint/suspicious/noConsoleLog: CLI
	// biome-ignore lint/suspicious/noConsole: CLI
	console.log(`created database ${testDbName}`);

	const { httpServer, appShutdown } = await startApp({
		config: {
			...config,
			databaseUrl: replaceDatabaseInUrl(config.databaseUrl, testDbName),
			logLevel: "warn",
		},
		packageJson,
	});

	async function cleanup() {
		await database.end();
		await appShutdown();

		const dbInstance = await getDatabase("postgres");
		await dbInstance.query(
			sql.unsafe`drop database if exists ${sql.identifier([testDbName])}`,
		);
		await dbInstance.end();

		// biome-ignore lint/suspicious/noConsoleLog: CLI
		// biome-ignore lint/suspicious/noConsole: CLI
		console.log(`dropped database ${testDbName}`);
	}

	return { database, httpServer, cleanup };
}
