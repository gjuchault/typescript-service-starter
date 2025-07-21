import type { Database } from "../../../infrastructure/database/database.ts";
import type { TaskScheduling } from "../../../infrastructure/task-scheduling/task-scheduling.ts";
import type { Telemetry } from "../../../infrastructure/telemetry/telemetry.ts";
import type { GetUsersFilters } from "../repository/get-by-ids.ts";
import type { UserRepository } from "../repository/index.ts";

export type GetUsersDependencies = {
	telemetry: Telemetry;
	userRepository: Pick<UserRepository, "getByIds">;
	database: Database;
	taskScheduling: Pick<TaskScheduling, "sendInTransaction">;
};

export async function* getUsers(
	{ ids }: GetUsersFilters,
	{ telemetry, userRepository, database, taskScheduling }: GetUsersDependencies,
) {
	return yield* telemetry.startSpanWith(
		{ spanName: "contexts/user/application/get-users@getUsers" },
		async function* () {
			const users = yield* userRepository.getByIds(
				{ ids },
				{ telemetry, database, taskScheduling },
			);

			return users;
		},
	);
}
