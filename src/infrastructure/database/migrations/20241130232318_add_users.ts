import { sql } from "slonik";
import type { Database } from "../database.ts";

export async function up(database: Database) {
	await database.transaction(async (tx) => {
		await tx.any(
			sql.unsafe`
				create table users (
					id serial primary key,
					name text not null,
					email text not null
				);
			`,
		);
	});
}

export async function down() {
	// no-op
}
