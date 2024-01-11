import type { NonEmptyArray } from "@gjuchault/typescript-service-sdk";
import type { Result } from "neverthrow";

import type { User } from "~/domain/user.js";
import type { GetUsersError } from "~/repository/user";
import type { DependencyStore } from "~/store";

export type GetUsersResult = Result<NonEmptyArray<User>, GetUsersError>;

export async function getUsers({
  dependencyStore,
}: {
  dependencyStore: DependencyStore;
}): Promise<GetUsersResult> {
  const repository = dependencyStore.get("userRepository");
  const users = await repository.get({}, { dependencyStore });

  return users;
}
