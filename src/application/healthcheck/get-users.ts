import type { NonEmptyArray } from "@gjuchault/typescript-service-sdk";
import type { Result } from "neverthrow";

import type { User } from "~/domain/user.js";
import type { GetUsersError as GetUsersRepositoryError } from "~/repository/user/index.js";
import { DependencyStore } from "~/store";

export type GetUsersResult = Result<
  NonEmptyArray<User>,
  GetUsersRepositoryError
>;

export async function getUsers({
  dependencyStore,
}: {
  dependencyStore: DependencyStore;
}): Promise<GetUsersResult> {
  const { user: userRepository } = dependencyStore.get("repository");
  const users = await userRepository.get();

  return users;
}
