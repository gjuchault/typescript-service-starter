import { sql } from "slonik";
import type { Database } from "../database.ts";
import { z } from "zod";
import { equal } from "node:assert/strict";

export async function up(database: Database) {
	const result =
		await database.oneFirst(
			sql.type(z.object({ count: z.number() }))`select 1 as count`,
		);

	equal(result, 1);
}

export async function down() {}
