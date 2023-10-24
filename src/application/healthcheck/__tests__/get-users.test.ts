import * as assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

import { ok } from "neverthrow";

import type { UserEmail, UserId, UserName } from "~/domain/user.js";
import type { UserRepository } from "~/repository/user/index.js";

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

describe("getUsers()", () => {
  describe("given a healthy cache and database", () => {
    describe("when called", () => {
      let result: GetUsersResult;

      before(async () => {
        result = await getUsers({
          userRepository: mockRepository,
        });
      });

      it("returns healthy", () => {
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
