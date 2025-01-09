import { sql } from "slonik";
import { config } from "../infrastructure/config/config.ts";
import { getMigrator } from "../infrastructure/database/migrator.ts";
import { packageJson } from "../packageJson.ts";
import { getDatabase } from "./get-database.ts";

export const templateDbName = "typescript-service-starter-test-template";

export async function initialSetup(): Promise<void> {
	const postgresInstance = await getDatabase("postgres");

	const pgDbResult = await postgresInstance.query(
		sql.unsafe`select datname from pg_database where datname = ${templateDbName};`,
	);

	if (pgDbResult.rowCount === 0) {
		// biome-ignore lint/suspicious/noConsoleLog: CLI
		// biome-ignore lint/suspicious/noConsole: CLI
		console.log("🚀 creating template database");
		await postgresInstance.query(
			sql.unsafe`create database ${sql.identifier([templateDbName])}`,
		);
	}

	const database = await getDatabase(templateDbName);
	const migrator = await getMigrator({
		database,
		config: { ...config, logLevel: "warn" },
		packageJson,
	});
	await migrator.up();
	await database.end();

	await postgresInstance.end();
}
