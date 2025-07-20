import { sql } from "slonik";
import * as z from "zod";
import type { Database } from "../database.ts";

export async function* up(tx: Database) {
	yield* tx.any(
		sql.type(z.unknown())`
				create table if not exists users (
					id serial primary key,
					name text not null,
					email text not null
				);
			`,
	);
}

export async function* down(tx: Database) {
	yield* tx.any(
		sql.type(z.unknown())`
				drop table if exists users;
			`,
	);
}
