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
import { createUserRepository, GetResult } from "../index.js";

describe("get()", () => {
  describe("given a database with users", () => {
    const { query, database } = createMockDatabase(vi, [
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

      beforeAll(async () => {
        result = await repository.get();
      });

      it("returns the data", () => {
        expect(result.isOk()).toBe(true);

        if (!result.isOk()) {
          expect.fail();
        }

        expect(result.value).toEqual([
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
        expect(query.mock.calls[0][0].trim()).toEqual("select * from users");
      });
    });
  });
});
