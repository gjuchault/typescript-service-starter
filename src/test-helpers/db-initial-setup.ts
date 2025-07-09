import { sql } from "slonik";
import { getMigrator } from "../infrastructure/database/migrator.ts";
import { getDatabase } from "./get-database.ts";

export const templateDbName = "typescript-service-starter-test-template";

export async function initialSetup(): Promise<void> {
	const postgresInstance = await getDatabase("postgres");

	const pgDbResult = await postgresInstance.query(
		sql.unsafe`select datname from pg_database where datname = ${templateDbName};`,
	);

	if (pgDbResult.rowCount === 0) {
		console.log("🚀 creating template database");
		await postgresInstance.query(
			sql.unsafe`create database ${sql.identifier([templateDbName])}`,
		);
	}

	const database = await getDatabase(templateDbName);
	const migrator = await getMigrator({ database });
	await migrator.up();
	await database.end();

	await postgresInstance.end();
}
