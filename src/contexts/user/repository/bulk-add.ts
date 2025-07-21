import { sql } from "slonik";
import * as z from "zod";

import { prepareBulkInsert } from "../../../helpers/prepare-bulk-insert.ts";
import type { Database } from "../../../infrastructure/database/database.ts";
import type { Telemetry } from "../../../infrastructure/telemetry/telemetry.ts";
import type { User } from "../domain/user.ts";
import { userToDatabaseUserSchema } from "./codecs.ts";

export interface BulkAddDependencies {
	telemetry: Telemetry;
	database: Database;
}

export async function* bulkAdd(
	users: User[],
	{ telemetry, database }: BulkAddDependencies,
) {
	return yield* telemetry.startSpanWith(
		{ spanName: "contexts/user/repository/bulk-add@bulkAdd" },
		async function* () {
			const { columns, rows } = prepareBulkInsert(
				[
					["id", "bool"],
					["name", "text"],
					["email", "text"],
				],
				users,
				(user) => userToDatabaseUserSchema.parse(user),
			);

			yield* database.query(sql.type(z.unknown())`
				insert into "users"(${columns})
				select * from ${rows}
			`);

			return users;
		},
	);
}
