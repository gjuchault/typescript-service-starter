import { getUsers } from "./get-users.ts";

export interface UserService {
	getUsers: typeof getUsers;
}

export const userService = {
	getUsers,
};
