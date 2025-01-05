import type { ExtendResult } from "../../../helpers/result.ts";
import type { Config } from "../../../infrastructure/config/config.ts";
import type { Database } from "../../../infrastructure/database/database.ts";
import type { PackageJson } from "../../../packageJson.ts";
import type { GetUsersFilters } from "../repository/get-by-ids.ts";
import type { UserRepository } from "../repository/index.ts";

export type GetUsersResult = ExtendResult<
	Awaited<ReturnType<UserRepository["getByIds"]>>
>;

export async function getUsers(
	{ ids }: GetUsersFilters,
	{
		userRepository,
		database,
		config,
		packageJson,
	}: {
		userRepository: Pick<UserRepository, "getByIds">;
		database: Database;
		config: Pick<Config, "logLevel">;
		packageJson: Pick<PackageJson, "name">;
	},
): Promise<GetUsersResult> {
	const users = await userRepository.getByIds(
		{ ids },
		{ database, config, packageJson },
	);

	return users;
}
