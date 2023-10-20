import {
  createNonEmptyArraySchema,
  Logger,
  NonEmptyArray,
  prepareBulkInsert,
  PrepareBulkInsertError,
} from "@gjuchault/typescript-service-sdk";
import { err, fromPromise, ok, Result } from "neverthrow";
import { DatabasePool, SlonikError, sql } from "slonik";
import { z } from "zod";

import type { User } from "~/domain/user.js";
import { userSchema } from "~/domain/user.js";

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

export interface SQLError {
  reason: "queryFailed";
  error: SlonikError;
}

export interface UnknownError {
  reason: "unknown";
  error: unknown;
}

export type GetResult = Result<NonEmptyArray<User>, GetUsersError>;
export type BulkAddResult = Result<
  User[],
  PrepareBulkInsertError | SQLError | UnknownError
>;

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
          sql.type(databaseUserSchema)`select * from users ${idsFragment}`,
        ),
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
      (user) => ({ ...user }),
    );

    // Procedural version of the functional below:
    // if (prepareBulkInsertResult.isErr()) {
    //   return err(prepareBulkInsertResult.error);
    // }

    // const { columns, rows } = prepareBulkInsertResult.value;

    // try {
    //   await database.query(sql.type(z.unknown())`
    //     insert into "users"(${columns})
    //     select * from ${rows}
    //   `);
    // } catch (error) {
    //   if (error instanceof SlonikError) {
    //     return err({ reason: "queryFailed", error });
    //   }

    //   return err({ reason: "unknown", error });
    // }

    // return ok(users);

    return prepareBulkInsertResult
      .asyncAndThen(({ columns, rows }) => {
        return fromPromise(
          database.query(sql.type(z.unknown())`
            insert into "users"(${columns})
            select * from ${rows}
          `),
          (error: unknown): SQLError | UnknownError => {
            if (error instanceof SlonikError) {
              return { reason: "queryFailed", error };
            }

            return { reason: "unknown", error };
          },
        );
      })
      .map(() => users);
  }

  return { get, bulkAdd };
}
