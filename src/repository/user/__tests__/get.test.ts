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

import { createUserRepository, GetResult } from "../index.js";

describe("get()", () => {
  describe("given a database with users", () => {
    const { query, database } = createMockDatabase([
      {
        id: userIdSchema.parse(1),
        name: userNameSchema.parse("John"),
        email: userEmailSchema.parse("john@mail.com"),
      },
      {
        id: userIdSchema.parse(2),
        name: userNameSchema.parse("Doe"),
        email: userEmailSchema.parse("doe@mail.com"),
      },
    ]);

    const repository = createUserRepository({
      database,
      logger: createMockLogger(),
    });

    describe("when called", () => {
      let result: GetResult;

      before(async () => {
        result = await repository.get();
      });

      it("returns the data", () => {
        assert.equal(result.isOk(), true);

        if (!result.isOk()) {
          assert.fail();
        }

        assert.deepEqual(result.value, [
          {
            id: 1,
            name: "John",
            email: "john@mail.com",
          },
          {
            id: 2,
            name: "Doe",
            email: "doe@mail.com",
          },
        ]);
      });

      it("called the database with the appropriate query", () => {
        assert.equal(query.mock.calls.length, 1);
        assert.deepEqual(
          (query.mock.calls[0].arguments as string[])[0].trim(),
          "select * from users",
        );
      });
    });
  });
});
