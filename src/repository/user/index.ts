import {
  Result,
  Option,
  err,
  ok,
  prepareBulkInsert,
  PrepareBulkInsertError,
  NonEmptyArray,
  makeNonEmptyArray,
  Logger,
} from "@gjuchault/typescript-service-sdk";
import { DatabasePool, sql } from "slonik";
import { z } from "zod";
import {
  makeUserEmail,
  makeUserId,
  makeUserName,
  type User,
} from "../../domain/user.js";

export interface UserRepository {
  get(filters?: GetUsersFilters): Promise<GetResult>;
  bulkAdd(users: User[]): Promise<BulkAddResult>;
}

export interface GetUsersFilters {
  ids?: NonEmptyArray<number>;
}

export interface GetUsersError {
  reason: "queryFailed";
}

export type GetResult = Result<Option<NonEmptyArray<User>>, GetUsersError>;
export type BulkAddResult = Result<User[], PrepareBulkInsertError>;

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
  async function get(filters?: GetUsersFilters): Promise<GetResult> {
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

      return err({ reason: "queryFailed" });
    }
  }

  async function bulkAdd(users: User[]): Promise<BulkAddResult> {
    const prepareBulkInsertResult = prepareBulkInsert(
      [
        ["id", "bool"],
        ["name", "text"],
        ["email", "text"],
      ],
      users,
      (user) => ({ ...user })
    );

    if (prepareBulkInsertResult.err) {
      return prepareBulkInsertResult;
    }

    const { columns, rows } = prepareBulkInsertResult.val;

    await database.query(sql.type(z.unknown())`
      insert into "users"(${columns})
      select * from ${rows}
    `);

    return ok(users);
  }

  return { get, bulkAdd };
}
