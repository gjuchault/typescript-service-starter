import * as assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

import type { Redis } from "ioredis";
import { err, ok } from "neverthrow";

import { HealthcheckRepository } from "~/repository/index.js";
import { buildMockDependencyStore } from "~/test-helpers/mock.js";

import type { GetHealthcheckResult } from "../get-healthcheck.js";
import { getHealthcheck } from "../get-healthcheck.js";

const mockHealthyCache = {
  echo: mock.fn(() => Promise.resolve("1")),
} as unknown as Redis;

const mockUnhealthyCache = {
  echo: mock.fn(() => Promise.reject(new Error("error"))),
} as unknown as Redis;

const mockHealthyRepository: HealthcheckRepository = {
  getHealthcheck: mock.fn(() => Promise.resolve(ok("healthy"))),
};

const mockUnhealthyRepository: HealthcheckRepository = {
  getHealthcheck: mock.fn(() => Promise.resolve(err("databaseError"))),
};

await describe("getHealthcheck()", async () => {
  await describe("given a healthy cache and database", async () => {
    const dependencyStore = buildMockDependencyStore({
      cache: mockHealthyCache,
      healthcheckRepository: mockHealthyRepository,
    });

    await describe("when called", async () => {
      let result: GetHealthcheckResult;

      before(async () => {
        result = await getHealthcheck({
          dependencyStore,
          requestId: "requestId",
        });
      });

      await it("returns healthy", () => {
        assert.equal(result.cache, "healthy");
        assert.equal(result.database, "healthy");

        // in Github Actions, process memory seems to be low or static
        if (process.env.CI === undefined) {
          assert.equal(result.systemMemory, "healthy");
          assert.equal(result.processMemory, "healthy");
        }
      });
    });
  });

  await describe("given an unhealthy cache and healthy database", async () => {
    const dependencyStore = buildMockDependencyStore({
      cache: mockUnhealthyCache,
      healthcheckRepository: mockHealthyRepository,
    });

    await describe("when called", async () => {
      let result: GetHealthcheckResult;

      before(async () => {
        result = await getHealthcheck({
          dependencyStore,
          requestId: "requestId",
        });
      });

      await it("returns unhealthy cache, healthy database", () => {
        assert.equal(result.cache, "unhealthy");
        assert.equal(result.database, "healthy");

        // in Github Actions, process memory seems to be low or static
        if (process.env.CI === undefined) {
          assert.equal(result.systemMemory, "healthy");
          assert.equal(result.processMemory, "healthy");
        }
      });
    });
  });

  await describe("given a healthy cache and unhealthy database", async () => {
    const dependencyStore = buildMockDependencyStore({
      cache: mockHealthyCache,
      healthcheckRepository: mockUnhealthyRepository,
    });

    await describe("when called", async () => {
      let result: GetHealthcheckResult;

      before(async () => {
        result = await getHealthcheck({
          dependencyStore,
          requestId: "requestId",
        });
      });

      await it("returns unhealthy cache, healthy database", () => {
        assert.equal(result.cache, "healthy");
        assert.equal(result.database, "unhealthy");

        // in Github Actions, process memory seems to be low or static
        if (process.env.CI === undefined) {
          assert.equal(result.systemMemory, "healthy");
          assert.equal(result.processMemory, "healthy");
        }
      });
    });
  });

  await describe("given a healthy cache and database", async () => {
    const dependencyStore = buildMockDependencyStore({
      cache: mockUnhealthyCache,
      healthcheckRepository: mockUnhealthyRepository,
    });

    await describe("when called", async () => {
      let result: GetHealthcheckResult;

      before(async () => {
        result = await getHealthcheck({
          dependencyStore,
          requestId: "requestId",
        });
      });

      await it("returns unhealthy cache, healthy database", () => {
        assert.equal(result.cache, "unhealthy");
        assert.equal(result.database, "unhealthy");

        // in Github Actions, process memory seems to be low or static
        if (process.env.CI === undefined) {
          assert.equal(result.systemMemory, "healthy");
          assert.equal(result.processMemory, "healthy");
        }
      });
    });
  });
});
