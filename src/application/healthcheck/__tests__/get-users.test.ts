import * as assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

import { ok } from "neverthrow";

import type { UserEmail, UserId, UserName } from "~/domain/user.js";
import type { UserRepository } from "~/repository/user/index.js";
import { buildMockDependencyStore } from "~/test-helpers/mock.js";

import { getUsers, GetUsersResult } from "../get-users.js";

const mockRepository: UserRepository = {
  get: mock.fn(() =>
    Promise.resolve(
      ok([
        {
          id: 1 as UserId,
          name: "John" as UserName,
          email: "john@mail.com" as UserEmail,
        },
      ]),
    ),
  ),
  bulkAdd: mock.fn(),
};

await describe("getUsers()", async () => {
  await describe("given a repository", async () => {
    const dependencyStore = buildMockDependencyStore({
      repository: { user: mockRepository },
    });

    await describe("when called", async () => {
      let result: GetUsersResult;

      before(async () => {
        result = await getUsers({
          dependencyStore,
        });
      });

      await it("returns healthy", () => {
        assert.equal(result.isOk(), true);

        if (result.isErr()) {
          assert.fail();
        }

        assert.deepEqual(result.value, [
          {
            id: 1,
            name: "John",
            email: "john@mail.com",
          },
        ]);
      });
    });
  });
});
