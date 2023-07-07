import {
  createFailingQueryMockDatabase,
  createMockDatabase,
} from "@gjuchault/typescript-service-sdk";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createHealthcheckRepository, GetHealthcheckResult } from "../index.js";

describe("getHealthcheck()", () => {
  describe("given a healthy database", () => {
    const { query, database } = createMockDatabase(vi, []);

    const repository = createHealthcheckRepository({
      database,
    });

    describe("when called", () => {
      let result: GetHealthcheckResult;

      beforeAll(async () => {
        result = await repository.getHealthcheck();
      });

      it("returns outcome healthy", () => {
        expect(result.outcome).toBe("healthy");
      });

      it("called the database with the appropriate query", () => {
        expect(query).toBeCalledTimes(1);
        expect(query.mock.calls[0][0]).toEqual("select 1");
      });
    });
  });

  describe("given an unhealthy database", () => {
    const { query, database } = createFailingQueryMockDatabase(vi);

    const repository = createHealthcheckRepository({
      database,
    });

    describe("when called", () => {
      let result: GetHealthcheckResult;

      beforeAll(async () => {
        result = await repository.getHealthcheck();
      });

      it("returns outcome unhealthy", () => {
        expect(result.outcome).toBe("unhealthy");
      });

      it("called the database with the appropriate query", () => {
        expect(query).toBeCalledTimes(1);
        expect(query.mock.calls[0][0]).toEqual("select 1");
      });
    });
  });
});