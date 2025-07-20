import { sql } from "slonik";
import { unsafeFlowOrThrow } from "ts-flowgen";
import { Umzug } from "umzug";
import * as z from "zod";
import type { Database } from "./database.ts";
import * as allMigrations from "./migrations/index.ts";

async function* ensureTable({
	database,
}: {
	database: Database;
}): AsyncGenerator<unknown, void> {
	yield* database.query(sql.type(z.unknown())`
		create table if not exists "public"."migrations" (
			"name" varchar, primary key ("name")
		);
	`);
}

async function* executed({
	database,
}: {
	database: Database;
}): AsyncGenerator<unknown, string[]> {
	yield* ensureTable({ database });
	const migrations = yield* database.anyFirst(sql.type(
		z.object({ name: z.string() }),
	)`
		select "name"
		from "public"."migrations"
		order by "name" asc;
	`);

	return [...migrations];
}

async function* logMigration(
	{ name }: { name: string },
	{ database }: { database: Database },
): AsyncGenerator<unknown, void> {
	yield* database.query(sql.type(z.unknown())`
		insert into "public"."migrations" ("name")
		values (${name});
	`);
}

async function* unlogMigration(
	{ name }: { name: string },
	{ database }: { database: Database },
): AsyncGenerator<unknown, void> {
	yield* ensureTable({ database });

	yield* database.query(sql.type(z.unknown())`
		delete from "public"."migrations"
		where "name" = ${name};
	`);
}

export function getMigrator({ database }: { database: Database }) {
	return new Umzug<Record<never, never>>({
		migrations: Object.entries(allMigrations).map(([name, migration]) => ({
			name,
			async up() {
				await unsafeFlowOrThrow(() => migration.up(database));
			},
			async down() {
				await unsafeFlowOrThrow(() => migration.down(database));
			},
		})),
		logger: undefined,
		context: database,
		storage: {
			async executed(): Promise<string[]> {
				return await unsafeFlowOrThrow(() => executed({ database }));
			},
			async logMigration({ name }): Promise<void> {
				return await unsafeFlowOrThrow(() =>
					logMigration({ name }, { database }),
				);
			},
			async unlogMigration({ name }): Promise<void> {
				return await unsafeFlowOrThrow(() =>
					unlogMigration({ name }, { database }),
				);
			},
		},
	});
}
