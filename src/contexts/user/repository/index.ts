import type { Database } from "../../../infrastructure/database/database.ts";
import type { User } from "../domain/user.ts";
import type { BulkAddResult } from "./bulk-add.ts";
import { bulkAdd } from "./bulk-add.ts";
import type {
	GetByIdsDependencies,
	GetResult,
	GetUsersFilters,
} from "./get-by-ids.ts";
import { getByIds } from "./get-by-ids.ts";

export interface UserRepository {
	getByIds(
		filters: GetUsersFilters,
		dependencies: GetByIdsDependencies,
	): Promise<GetResult>;
	bulkAdd(
		users: User[],
		dependencies: { database: Database },
	): Promise<BulkAddResult>;
}

export const userRepository: UserRepository = {
	getByIds,
	bulkAdd,
};
