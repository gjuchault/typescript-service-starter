import { DatabasePool, sql } from "slonik";
import { Result, Option, Err as error, Ok as ok } from "ts-results";
import { z } from "zod";
import {
  makeUserEmail,
  makeUserId,
  makeUserName,
  type User,
} from "../../domain/user.js";
import {
  NonEmptyArray,
  makeNonEmptyArray,
} from "../../helpers/narrow-types/non-empty-array.js";
import { Logger } from "../../infrastructure/logger/index.js";

export interface UserRepository {
  getUsers(filters?: GetUsersFilters): Promise<GetUserResult>;
}

export interface GetUsersFilters {
  ids?: NonEmptyArray<number>;
}

export interface GetUsersError {
  reason: "queryFailed";
}

export type GetUserResult = Result<Option<NonEmptyArray<User>>, GetUsersError>;

const databaseUserSchema = z.object({
  id: z.number().transform((id) => makeUserId(id)),
  name: z.string().transform((name) => makeUserName(name)),
  email: z.string().transform((email) => makeUserEmail(email)),
});

export function createUserRepository({
  database,
  logger,
}: {
  database: DatabasePool;
  logger: Logger;
}): UserRepository {
  async function getUsers(filters?: GetUsersFilters): Promise<GetUserResult> {
    const idsFragment =
      filters?.ids === undefined
        ? sql.fragment``
        : sql.fragment`where id = any(${sql.array(filters.ids, "int4")})`;

    try {
      const users = makeNonEmptyArray(
        await database.any(
          sql.type(databaseUserSchema)`select * from users ${idsFragment}`
        )
      );

      return ok(users);
    } catch (rawError) {
      logger.error("SQL error when calling getUsers", {
        filters,
        error: rawError,
      });

      return error({ reason: "queryFailed" });
    }
  }

  return { getUsers };
}
