import { Option, Result } from "ts-results";
import type { User } from "../../domain/user.js";
import { NonEmptyArray } from "../../helpers/narrow-types/non-empty-array.js";
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
  const users = await userRepository.getUsers();

  return users;
}
