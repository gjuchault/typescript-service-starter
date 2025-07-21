import { sql } from "slonik";

import type { NonEmptyArray } from "../../../helpers/non-empty-array.ts";
import type { Database } from "../../../infrastructure/database/database.ts";
import type { TaskScheduling } from "../../../infrastructure/task-scheduling/task-scheduling.ts";
import type { Telemetry } from "../../../infrastructure/telemetry/telemetry.ts";
import { databaseUserToUserSchema } from "./codecs.ts";

export interface GetUsersFilters {
	ids?: NonEmptyArray<number> | undefined;
}

export interface GetByIdsDependencies {
	telemetry: Telemetry;
	database: Database;
	taskScheduling: Pick<TaskScheduling, "sendInTransaction">;
}

export async function* getByIds(
	filters: GetUsersFilters,
	{ telemetry, database, taskScheduling }: GetByIdsDependencies,
) {
	return yield* telemetry.startSpanWith(
		{ spanName: "contexts/user/repository/get-by-ids@getByIds" },
		async function* () {
			const idsFragment =
				filters.ids !== undefined
					? sql.fragment`and id = any(${sql.array(filters.ids, "int4")})`
					: sql.fragment``;

			return yield* database.transaction(async function* (tx) {
				const users = yield* tx.any(
					sql.type(
						databaseUserToUserSchema,
					)`select * from users where 1=1 ${idsFragment}`,
				);

				yield* taskScheduling.sendInTransaction(tx, { users }, {});

				return users;
			});
		},
	);
}
