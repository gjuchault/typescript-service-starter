import * as assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { slonikHelpers } from "@gjuchault/typescript-service-sdk";

import { buildMockDependencyStore } from "~/test-helpers/mock.js";

import { getHealthcheck, GetHealthcheckResult } from "../index.js";

await describe("getHealthcheck()", async () => {
  await describe("given a healthy database", async () => {
    const { query, database } = slonikHelpers.createMockDatabase([]);
    const dependencyStore = buildMockDependencyStore({ database });

    await describe("when called", async () => {
      let result: GetHealthcheckResult;

      before(async () => {
        result = await getHealthcheck({
          dependencyStore,
          requestId: "requestId",
        });
      });

      await it("returns ok", () => {
        assert.equal(result.isOk(), true);
      });

      await it("called the database with the appropriate query", () => {
        assert.equal(query.mock.calls.length, 1);
        assert.deepEqual(query.mock.calls[0].arguments, ["select 1", []]);
      });
    });
  });

  await describe("given an unhealthy database", async () => {
    const { query, database } = slonikHelpers.createFailingQueryMockDatabase();
    const dependencyStore = buildMockDependencyStore({ database });

    await describe("when called", async () => {
      let result: GetHealthcheckResult;

      before(async () => {
        result = await getHealthcheck({
          dependencyStore,
          requestId: "requestId",
        });
      });

      await it("returns err", () => {
        assert.equal(result.isErr(), true);
      });

      await it("called the database with the appropriate query", () => {
        assert.equal(query.mock.calls.length, 1);
        assert.deepEqual(query.mock.calls[0].arguments, ["select 1", []]);
      });
    });
  });
});
