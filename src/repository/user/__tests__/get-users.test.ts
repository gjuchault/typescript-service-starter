import { createMockPool, createMockQueryResult } from "slonik";
import { beforeAll, describe, it, vi, expect } from "vitest";
import { createUserRepository, GetUserResult } from "../index.js";

describe("getUsers()", () => {
  describe("given a database with users", () => {
    const query = vi.fn().mockResolvedValue(
      createMockQueryResult([
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
      ])
    );

    const database = createMockPool({
      query,
    });

    const repository = createUserRepository({
      database,
    });

    describe("when called", () => {
      let result: GetUserResult;

      beforeAll(async () => {
        result = await repository.getUsers();
      });

      it("returns outcome healthy", () => {
        expect(result).toEqual([
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
        expect(query).toBeCalledTimes(1);
        expect(query.mock.calls[0][0]).toEqual("select * from users");
      });
    });
  });
});
