import { sql } from "slonik";
import { gen, never } from "ts-flowgen";
import * as z from "zod";
import { getMigrator } from "../infrastructure/database/migrator.ts";
import { getDatabase } from "./get-database.ts";

export const templateDbName = "typescript-service-starter-test-template";

export async function* initialSetup() {
	const postgresInstance = yield* getDatabase("postgres");

	const pgDbResult = yield* postgresInstance.query(
		sql.type(
			z.unknown(),
		)`select datname from pg_database where datname = ${templateDbName};`,
	);

	if (pgDbResult.rowCount === 0) {
		console.log("🚀 creating template database");
		yield* postgresInstance.query(
			sql.type(
				z.unknown(),
			)`create database ${sql.identifier([templateDbName])}`,
		);
	}

	const database = yield* getDatabase(templateDbName);
	const migrator = await getMigrator({ database });
	yield* gen(() => migrator.up())();

	if (database.end === undefined) {
		yield new Error("database.end is undefined - did you pass a transaction?");
		return never();
	}

	yield* database.end();

	if (postgresInstance.end === undefined) {
		yield new Error(
			"postgresInstance.end is undefined - did you pass a transaction?",
		);
		return never();
	}

	yield* postgresInstance.end();
}
