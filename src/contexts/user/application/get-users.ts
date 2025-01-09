import type { ExtendResult } from "../../../helpers/result.ts";
import type { Config } from "../../../infrastructure/config/config.ts";
import type { Database } from "../../../infrastructure/database/database.ts";
import type { Telemetry } from "../../../infrastructure/telemetry/telemetry.ts";
import type { PackageJson } from "../../../packageJson.ts";
import type { GetUsersFilters } from "../repository/get-by-ids.ts";
import type { UserRepository } from "../repository/index.ts";

export type GetUsersResult = ExtendResult<
	Awaited<ReturnType<UserRepository["getByIds"]>>
>;

export type GetUsersDependencies = {
	telemetry: Telemetry;
	userRepository: Pick<UserRepository, "getByIds">;
	database: Database;
	config: Pick<Config, "logLevel">;
	packageJson: Pick<PackageJson, "name">;
};

export async function getUsers(
	{ ids }: GetUsersFilters,
	{
		telemetry,
		userRepository,
		database,
		config,
		packageJson,
	}: GetUsersDependencies,
): Promise<GetUsersResult> {
	return await telemetry.startSpanWith(
		{ spanName: "contexts/users/application/get-users@getUsers" },
		async () => {
			const users = await userRepository.getByIds(
				{ ids },
				{ telemetry, database, config, packageJson },
			);

			return users;
		},
	);
}
