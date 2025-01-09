import { sql } from "slonik";
import { Umzug } from "umzug";
import { z } from "zod";

import type { Database } from "./database.ts";

// biome-ignore lint/style/noNamespaceImport: migrations
import * as allMigrations from "./migrations/index.ts";

async function ensureTable({
	database,
}: { database: Database }): Promise<void> {
	await database.query(sql.type(z.unknown())`
		create table if not exists "public"."migrations" (
			"name" varchar, primary key ("name")
		);
	`);
}

async function executed({
	database,
}: { database: Database }): Promise<string[]> {
	await ensureTable({ database });
	const migrations = await database.anyFirst(sql.type(
		z.object({ name: z.string() }),
	)`
		select "name"
		from "public"."migrations"
		order by "name" asc;
	`);

	return [...migrations];
}

async function logMigration(
	{ name }: { name: string },
	{ database }: { database: Database },
): Promise<void> {
	await database.query(sql.type(z.unknown())`
		insert into "public"."migrations" ("name")
		values (${name});
	`);
}

async function unlogMigration(
	{ name }: { name: string },
	{ database }: { database: Database },
): Promise<void> {
	await ensureTable({ database });

	await database.query(sql.type(z.unknown())`
		delete from "public"."migrations"
		where "name" = ${name};
	`);
}

export function getMigrator({
	database,
}: {
	database: Database;
}) {
	return new Umzug<Record<never, never>>({
		migrations: Object.entries(allMigrations).map(([name, migration]) => ({
			name,
			async up() {
				await migration.up(database);
			},
			async down() {
				await migration.down(database);
			},
		})),
		logger: undefined,
		context: database,
		storage: {
			async executed(): Promise<string[]> {
				return await executed({ database });
			},
			async logMigration({ name }): Promise<void> {
				return await logMigration({ name }, { database });
			},
			async unlogMigration({ name }): Promise<void> {
				return await unlogMigration({ name }, { database });
			},
		},
	});
}
