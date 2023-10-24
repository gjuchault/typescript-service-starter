import * as assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  createMockDatabase,
  createMockLogger,
} from "@gjuchault/typescript-service-sdk";

import {
  userEmailSchema,
  userIdSchema,
  userNameSchema,
} from "~/domain/user.js";

import { BulkAddResult, createUserRepository } from "../index.js";

describe("getUsers()", () => {
  describe("given a database with users", () => {
    const { query, database } = createMockDatabase([]);

    const repository = createUserRepository({
      database,
      logger: createMockLogger(),
    });

    describe("when called", () => {
      let result: BulkAddResult;

      before(async () => {
        result = await repository.bulkAdd([
          {
            id: userIdSchema.parse(1),
            email: userEmailSchema.parse("foo@bar.com"),
            name: userNameSchema.parse("Foo"),
          },
          {
            id: userIdSchema.parse(2),
            email: userEmailSchema.parse("john@doe.com"),
            name: userNameSchema.parse("John Doe"),
          },
        ]);
      });

      it("returns the users", () => {
        assert.equal(result.isOk(), true);

        if (!result.isOk()) {
          assert.fail();
        }

        assert.deepEqual(result.value, [
          {
            id: 1,
            name: "Foo",
            email: "foo@bar.com",
          },
          {
            id: 2,
            name: "John Doe",
            email: "john@doe.com",
          },
        ]);
      });

      it("called the database with the appropriate query", () => {
        assert.equal(query.mock.calls.length, 1);

        const arguments_ = query.mock.calls[0].arguments as unknown as [
          string,
          unknown[],
        ];

        assert.deepEqual(arguments_[0].trim().split(/\s{2,}/), [
          'insert into "users"("id", "name", "email")',
          'select * from unnest($1::"bool"[], $2::"text"[], $3::"text"[])',
        ]);
        assert.deepEqual(arguments_[1], [
          [1, 2],
          ["Foo", "John Doe"],
          ["foo@bar.com", "john@doe.com"],
        ]);
      });
    });
  });
});
