import type {
  NonEmptyArray,
  Option,
  Result,
} from "@gjuchault/typescript-service-sdk";
import type { User } from "../../domain/user.js";
import type {
  GetUsersError as GetUsersRepositoryError,
  UserRepository,
} from "../../repository/user/index.js";

export type GetUsersResult = Result<
  Option<NonEmptyArray<User>>,
  GetUsersRepositoryError
>;

export async function getUsers({
  userRepository,
}: {
  userRepository: UserRepository;
}): Promise<GetUsersResult> {
  const users = await userRepository.get();

  return users;
}
