import { deepEqual, equal } from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { ok } from "../../../../helpers/result.ts";
import { mockTelemetry } from "../../../../infrastructure/telemetry/telemetry.ts";
import { mockDependencies } from "../../../../test-helpers/mock-object.ts";
import { createMockUser } from "../../domain/user.ts";
import { type GetUsersDependencies, getUsers } from "../get-users.ts";

await describe("getUsers()", async () => {
	await describe("when called, given some ids", async () => {
		const dependencies = mockDependencies<GetUsersDependencies>({
			telemetry: mockTelemetry,
			userRepository: {
				getByIds: mock.fn(async () => {
					return await Promise.resolve(ok([createMockUser()]));
				}),
			},
		});

		const result = await getUsers({ ids: [1] }, dependencies);

		await it("properly calls the repository and returns the users", () => {
			equal(result.ok, true);
			deepEqual(result.value, [
				{ id: 1, name: "name", email: "email@email.com" },
			]);
		});
	});
});
