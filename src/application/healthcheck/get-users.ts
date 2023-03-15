import type { User } from "../../domain/user.js";
import type { UserRepository } from "../../repository/user/index.js";

export type GetUsersResult = readonly User[];

export async function getUsers({
  userRepository,
}: {
  userRepository: UserRepository;
}): Promise<GetUsersResult> {
  const users = await userRepository.getUsers();

  return users;
}
