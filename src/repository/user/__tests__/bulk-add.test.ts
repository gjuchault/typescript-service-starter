import {
  createMockDatabase,
  createMockLogger,
} from "@gjuchault/typescript-service-sdk";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  userEmailSchema,
  userIdSchema,
  userNameSchema,
} from "../../../domain/user.js";
import { BulkAddResult,createUserRepository } from "../index.js";

describe("getUsers()", () => {
  describe("given a database with users", () => {
    const { query, database } = createMockDatabase(vi, []);

    const repository = createUserRepository({
      database,
      logger: createMockLogger(),
    });

    describe("when called", () => {
      let result: BulkAddResult;

      beforeAll(async () => {
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
        expect(result.ok).toBe(true);

        if (!result.ok) {
          expect.fail();
        }

        expect(result.val).toEqual([
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
        expect(query).toBeCalledTimes(1);
        expect(query.mock.calls[0][0].trim().split(/\s{2,}/)).toEqual([
          'insert into "users"("id", "name", "email")',
          'select * from unnest($1::"bool"[], $2::"text"[], $3::"text"[])',
        ]);
        expect(query.mock.calls[0][1]).toEqual([
          [1, 2],
          ["Foo", "John Doe"],
          ["foo@bar.com", "john@doe.com"],
        ]);
      });
    });
  });
});
