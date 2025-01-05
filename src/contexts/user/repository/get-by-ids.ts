import { SlonikError, sql } from "slonik";

import { z } from "zod";
import type { SqlError, UnknownError } from "../../../helpers/errors.ts";
import type { NonEmptyArray } from "../../../helpers/non-empty-array.ts";
import { type Result, err, ok } from "../../../helpers/result.ts";
import type { Config } from "../../../infrastructure/config/config.ts";
import type { Database } from "../../../infrastructure/database/database.ts";
import { createLogger } from "../../../infrastructure/logger/logger.ts";
import type { PackageJson } from "../../../packageJson.ts";
import { type User, userSchema } from "../domain/user.ts";
import { databaseUserToUserSchema } from "./codecs.ts";

export interface GetUsersFilters {
	ids: NonEmptyArray<number>;
}

export interface GetByIdsDependencies {
	database: Database;
	config: Pick<Config, "logLevel">;
	packageJson: Pick<PackageJson, "name">;
}

export type GetResult = Result<User[], SqlError | UnknownError>;

export async function getByIds(
	filters: GetUsersFilters,
	{ database, config, packageJson }: GetByIdsDependencies,
): Promise<GetResult> {
	const logger = createLogger("contexts/user/repository", {
		config,
		packageJson,
	});

	const idsFragment = sql.fragment`where id = any(${sql.array(filters.ids, "int4")})`;

	try {
		const users = z
			.array(userSchema)
			.parse(
				await database.any(
					sql.type(
						databaseUserToUserSchema,
					)`select * from users ${idsFragment}`,
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
}
