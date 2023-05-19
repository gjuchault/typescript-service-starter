import {
  createNonEmptyArraySchema,
  err,
  Logger,
  NonEmptyArray,
  ok,
  prepareBulkInsert,
  PrepareBulkInsertError,
  Result,
} from "@gjuchault/typescript-service-sdk";
import { DatabasePool, sql } from "slonik";
import { z } from "zod";

import { type User,userSchema } from "../../domain/user.js";

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

export type GetResult = Result<NonEmptyArray<User>, GetUsersError>;
export type BulkAddResult = Result<User[], PrepareBulkInsertError>;

const nonEmptyUserArraySchema = createNonEmptyArraySchema(userSchema);

const databaseUserSchema = userSchema;

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
      const users = nonEmptyUserArraySchema.parse(
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
