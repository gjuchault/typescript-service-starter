import { bulkAdd } from "./bulk-add.ts";
import { getByIds } from "./get-by-ids.ts";

export interface UserRepository {
	getByIds: typeof getByIds;
	bulkAdd: typeof bulkAdd;
}

export const userRepository: UserRepository = {
	getByIds,
	bulkAdd,
};
