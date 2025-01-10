import { bulkAdd } from "./bulk-add.ts";
import { getByIds } from "./get-by-ids.ts";

export type UserRepository = typeof userRepository;

export const userRepository = {
	getByIds,
	bulkAdd,
};
