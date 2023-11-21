import * as assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  createFailingQueryMockDatabase,
  createMockDatabase,
} from "@gjuchault/typescript-service-sdk";

import { createHealthcheckRepository, GetHealthcheckResult } from "../index.js";

await describe("getHealthcheck()", async () => {
  await describe("given a healthy database", async () => {
    const { query, database } = createMockDatabase([]);

    const repository = createHealthcheckRepository({
      database,
    });

    await describe("when called", async () => {
      let result: GetHealthcheckResult;

      before(async () => {
        result = await repository.getHealthcheck();
      });

      await it("returns outcome healthy", () => {
        assert.equal(result.outcome, "healthy");
      });

      await it("called the database with the appropriate query", () => {
        assert.equal(query.mock.calls.length, 1);
        assert.deepEqual(query.mock.calls[0].arguments, ["select 1", []]);
      });
    });
  });

  await describe("given an unhealthy database", async () => {
    const { query, database } = createFailingQueryMockDatabase();

    const repository = createHealthcheckRepository({
      database,
    });

    await describe("when called", async () => {
      let result: GetHealthcheckResult;

      before(async () => {
        result = await repository.getHealthcheck();
      });

      await it("returns outcome unhealthy", () => {
        assert.equal(result.outcome, "unhealthy");
      });

      await it("called the database with the appropriate query", () => {
        assert.equal(query.mock.calls.length, 1);
        assert.deepEqual(query.mock.calls[0].arguments, ["select 1", []]);
      });
    });
  });
});
