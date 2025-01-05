import { SlonikError, sql } from "slonik";
import { z } from "zod";

import type { SqlError, UnknownError } from "../../../helpers/errors.ts";
import { prepareBulkInsert } from "../../../helpers/prepare-bulk-insert.ts";
import { type Result, err, ok } from "../../../helpers/result.ts";
import type { Config } from "../../../infrastructure/config/config.ts";
import type { Database } from "../../../infrastructure/database/database.ts";
import { createLogger } from "../../../infrastructure/logger/logger.ts";
import type { PackageJson } from "../../../packageJson.ts";
import type { User } from "../domain/user.ts";
import { userToDatabaseUserSchema } from "./codecs.ts";

export type BulkAddResult = Result<User[], SqlError | UnknownError>;

export interface GetByIdsDependencies {
	database: Database;
	config: Pick<Config, "logLevel">;
	packageJson: Pick<PackageJson, "name">;
}

export async function bulkAdd(
	users: User[],
	{
		database,
		config,
		packageJson,
	}: {
		database: Database;
		config: Pick<Config, "logLevel">;
		packageJson: Pick<PackageJson, "name">;
	},
): Promise<BulkAddResult> {
	const logger = createLogger("contexts/user/repository", {
		config,
		packageJson,
	});

	const { columns, rows } = prepareBulkInsert(
		[
			["id", "bool"],
			["name", "text"],
			["email", "text"],
		],
		users,
		(user) => userToDatabaseUserSchema.parse(user),
	);

	try {
		await database.query(sql.type(z.unknown())`
			insert into "users"(${columns})
			select * from ${rows}
		`);
	} catch (error) {
		logger.error("SQL error when calling getUsers", {
			cause: error,
		});

		if (error instanceof SlonikError) {
			return err({ reason: "queryFailed", error });
		}

		return err({ reason: "unknown", error });
	}

	return ok(users);
}
