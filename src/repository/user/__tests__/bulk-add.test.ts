import {
  createMockDatabase,
  createMockLogger,
} from "@gjuchault/typescript-service-sdk";
import { beforeAll, describe, it, expect, vi } from "vitest";
import {
  makeUserEmail,
  makeUserId,
  makeUserName,
} from "../../../domain/user.js";
import { createUserRepository, BulkAddResult } from "../index.js";

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
            id: makeUserId(1),
            email: makeUserEmail("foo@bar.com"),
            name: makeUserName("Foo"),
          },
          {
            id: makeUserId(2),
            email: makeUserEmail("john@doe.com"),
            name: makeUserName("John Doe"),
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
