import { SlonikError, sql } from "slonik";
import * as z from "zod";

import type { SqlError, UnknownError } from "../../../helpers/errors.ts";
import { prepareBulkInsert } from "../../../helpers/prepare-bulk-insert.ts";
import { err, ok, type Result } from "../../../helpers/result.ts";
import type { Config } from "../../../infrastructure/config/config.ts";
import type { Database } from "../../../infrastructure/database/database.ts";
import { createLogger } from "../../../infrastructure/logger/logger.ts";
import type { Telemetry } from "../../../infrastructure/telemetry/telemetry.ts";
import type { PackageJson } from "../../../packageJson.ts";
import type { User } from "../domain/user.ts";
import { userToDatabaseUserSchema } from "./codecs.ts";

export type BulkAddResult = Result<User[], SqlError | UnknownError>;

export interface BulkAddDependencies {
	telemetry: Telemetry;
	database: Database;
	config: Pick<Config, "logLevel">;
	packageJson: Pick<PackageJson, "name">;
}

export async function bulkAdd(
	users: User[],
	{ telemetry, database, config, packageJson }: BulkAddDependencies,
): Promise<BulkAddResult> {
	return await telemetry.startSpanWith(
		{ spanName: "contexts/user/repository/bulk-add@bulkAdd" },
		async () => {
			const logger = createLogger("contexts/user/repository/bulk-add@bulkAdd", {
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
		},
	);
}
