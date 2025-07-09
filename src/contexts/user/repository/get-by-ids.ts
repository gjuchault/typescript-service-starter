import { SlonikError, sql } from "slonik";

import { z } from "zod";
import type { SqlError, UnknownError } from "../../../helpers/errors.ts";
import type { NonEmptyArray } from "../../../helpers/non-empty-array.ts";
import { err, ok, type Result } from "../../../helpers/result.ts";
import type { Config } from "../../../infrastructure/config/config.ts";
import type { Database } from "../../../infrastructure/database/database.ts";
import { createLogger } from "../../../infrastructure/logger/logger.ts";
import type { Telemetry } from "../../../infrastructure/telemetry/telemetry.ts";
import type { PackageJson } from "../../../packageJson.ts";
import { type User, userSchema } from "../domain/user.ts";
import { databaseUserToUserSchema } from "./codecs.ts";

export interface GetUsersFilters {
	ids?: NonEmptyArray<number> | undefined;
}

export interface GetByIdsDependencies {
	telemetry: Telemetry;
	database: Database;
	config: Pick<Config, "logLevel">;
	packageJson: Pick<PackageJson, "name">;
}

export type GetResult = Result<User[], SqlError | UnknownError>;

export async function getByIds(
	filters: GetUsersFilters,
	{ telemetry, database, config, packageJson }: GetByIdsDependencies,
): Promise<GetResult> {
	return await telemetry.startSpanWith(
		{ spanName: "contexts/user/repository/get-by-ids@getByIds" },
		async () => {
			const logger = createLogger(
				"contexts/user/repository/get-by-ids@getByIds",
				{
					config,
					packageJson,
				},
			);

			const idsFragment =
				filters.ids !== undefined
					? sql.fragment`and id = any(${sql.array(filters.ids, "int4")})`
					: sql.fragment``;

			try {
				const users = z
					.array(userSchema)
					.parse(
						await database.any(
							sql.type(
								databaseUserToUserSchema,
							)`select * from users where 1=1 ${idsFragment}`,
						),
					);

				return ok(users);
			} catch (error) {
				logger.error("SQL error when calling getUsers", {
					filters,
					error,
				});

				if (error instanceof SlonikError) {
					return err({ reason: "queryFailed", error });
				}

				return err({ reason: "unknown", error });
			}
		},
	);
}
