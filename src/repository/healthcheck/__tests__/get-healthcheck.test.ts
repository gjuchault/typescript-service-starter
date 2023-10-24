import * as assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  createFailingQueryMockDatabase,
  createMockDatabase,
} from "@gjuchault/typescript-service-sdk";

import { createHealthcheckRepository, GetHealthcheckResult } from "../index.js";

describe("getHealthcheck()", () => {
  describe("given a healthy database", () => {
    const { query, database } = createMockDatabase([]);

    const repository = createHealthcheckRepository({
      database,
    });

    describe("when called", () => {
      let result: GetHealthcheckResult;

      before(async () => {
        result = await repository.getHealthcheck();
      });

      it("returns outcome healthy", () => {
        assert.equal(result.outcome, "healthy");
      });

      it("called the database with the appropriate query", () => {
        assert.equal(query.mock.calls.length, 1);
        assert.deepEqual(query.mock.calls[0].arguments, ["select 1", []]);
      });
    });
  });

  describe("given an unhealthy database", () => {
    const { query, database } = createFailingQueryMockDatabase();

    const repository = createHealthcheckRepository({
      database,
    });

    describe("when called", () => {
      let result: GetHealthcheckResult;

      before(async () => {
        result = await repository.getHealthcheck();
      });

      it("returns outcome unhealthy", () => {
        assert.equal(result.outcome, "unhealthy");
      });

      it("called the database with the appropriate query", () => {
        assert.equal(query.mock.calls.length, 1);
        assert.deepEqual(query.mock.calls[0].arguments, ["select 1", []]);
      });
    });
  });
});
