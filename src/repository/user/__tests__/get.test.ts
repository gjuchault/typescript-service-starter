import * as assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  nonEmptyArray,
  slonikHelpers,
} from "@gjuchault/typescript-service-sdk";

import {
  userEmailSchema,
  userIdSchema,
  userNameSchema,
} from "~/domain/user.js";
import { buildMockDependencyStore } from "~/test-helpers/mock.js";

import type { GetResult } from "../index.js";
import { get } from "../index.js";

await describe("get()", async () => {
  await describe("given a database with users", async () => {
    const { query, database } = slonikHelpers.createMockDatabase([
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
    const dependencyStore = buildMockDependencyStore({ database });

    await describe("when called with no filters", async () => {
      let result: GetResult;

      before(async () => {
        result = await get({}, { dependencyStore });
      });

      await it("returns the data", () => {
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

      await it("called the database with the appropriate query", () => {
        assert.equal(query.mock.calls.length, 1);
        assert.deepEqual(
          (query.mock.calls[0].arguments as string[])[0].trim(),
          "select * from users",
        );
      });
    });

    await describe("when called with a filters", async () => {
      let result: GetResult;

      before(async () => {
        result = await get(
          { ids: nonEmptyArray.fromElements(1) },
          { dependencyStore },
        );
      });

      await it("returns the data", () => {
        assert.equal(result.isOk(), true);

        if (!result.isOk()) {
          assert.fail();
        }

        assert.deepEqual(result.value[0], {
          id: 1,
          name: "John",
          email: "john@mail.com",
        });
      });

      await it("called the database with the appropriate query", () => {
        assert.equal(query.mock.calls.length, 2);
        assert.deepEqual(
          (query.mock.calls[1].arguments as string[])[0].trim(),
          `select * from users where id = any($1::"int4"[])`,
        );

        assert.deepEqual((query.mock.calls[1].arguments as string[])[1], [[1]]);
      });
    });
  });

  await describe("given an erroring database", async () => {
    const { database } = slonikHelpers.createFailingQueryMockDatabase();
    const dependencyStore = buildMockDependencyStore({ database });

    await describe("when called with no filters", async () => {
      let result: GetResult;

      before(async () => {
        result = await get({}, { dependencyStore });
      });

      await it("returns an error", () => {
        assert.equal(result.isErr(), true);
      });
    });
  });
});
