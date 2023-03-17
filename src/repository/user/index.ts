import { DatabasePool, sql } from "slonik";
import { z } from "zod";
import {
  makeUserEmail,
  makeUserId,
  makeUserName,
  type User,
} from "../../domain/user.js";

export interface UserRepository {
  getUsers(): Promise<GetUserResult>;
}

export type GetUserResult = readonly User[];

const databaseUserSchema = z.object({
  id: z.number().transform((id) => makeUserId(id)),
  name: z.string().transform((name) => makeUserName(name)),
  email: z.string().transform((email) => makeUserEmail(email)),
});

export function createUserRepository({
  database,
}: {
  database: DatabasePool;
}): UserRepository {
  async function getUsers(): Promise<GetUserResult> {
    const users = await database.any(
      sql.type(databaseUserSchema)`select * from users`
    );

    return users;
  }

  return { getUsers };
}
