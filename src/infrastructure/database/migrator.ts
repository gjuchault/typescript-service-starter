import { sql } from "slonik";
import { Umzug } from "umzug";
import { z } from "zod";

import type { Database } from "./database.ts";

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

export function getMigrator({ database }: { database: Database }) {
	return new Umzug<Record<never, never>>({
		migrations: {
			glob: "src/infrastructure/database/migrations/*.ts",
			resolve({ name, path }) {
				if (!path) {
					throw new Error("`path` should be defined in migration");
				}

				return {
					name,
					path,
					async up() {
						const { up } = (await import(path)) as {
							up(database: Database): Promise<void>;
						};

						await up(database);
					},
					async down() {
						const { down } = (await import(path)) as {
							down(database: Database): Promise<void>;
						};

						await down(database);
					},
				};
			},
		},
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
