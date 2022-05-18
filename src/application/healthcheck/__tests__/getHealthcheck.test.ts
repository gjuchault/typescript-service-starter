import test from "ava";
import type { Redis } from "ioredis";
import type { HealthcheckRepository } from "../../../repository/healthcheck";
import { createGetHealthcheck } from "../getHealthcheck";

const mockHealthyCache = {
  echo: () => Promise.resolve("1"),
} as unknown as Redis;

const mockUnhealthyCache = {
  echo: () => Promise.reject(),
} as unknown as Redis;

const mockHealthyRepository: HealthcheckRepository = {
  async getHealthcheck() {
    return { outcome: "healthy" };
  },
};

const mockUnhealthyRepository: HealthcheckRepository = {
  async getHealthcheck() {
    return { outcome: "unhealthy" };
  },
};

test("getHealthcheck() - healthy cache, database", async (t) => {
  const getHealthcheck = createGetHealthcheck({
    cache: mockHealthyCache,
    healthcheckRepository: mockHealthyRepository,
  });

  const result = await getHealthcheck();

  t.is(result.cache, "healthy");
  t.is(result.database, "healthy");

  if (typeof process.env.CI === "undefined") {
    t.is(result.systemMemory, "healthy");
    t.is(result.processMemory, "healthy");
  }
});

test("getHealthcheck() - unhealthy cache, healthy database", async (t) => {
  const getHealthcheck = createGetHealthcheck({
    cache: mockUnhealthyCache,
    healthcheckRepository: mockHealthyRepository,
  });

  const result = await getHealthcheck();

  t.is(result.cache, "unhealthy");
  t.is(result.database, "healthy");

  if (typeof process.env.CI === "undefined") {
    t.is(result.systemMemory, "healthy");
    t.is(result.processMemory, "healthy");
  }
});

test("getHealthcheck() - healthy cache, unhealthy database", async (t) => {
  const getHealthcheck = createGetHealthcheck({
    cache: mockHealthyCache,
    healthcheckRepository: mockUnhealthyRepository,
  });

  const result = await getHealthcheck();

  t.is(result.cache, "healthy");
  t.is(result.database, "unhealthy");

  if (typeof process.env.CI === "undefined") {
    t.is(result.systemMemory, "healthy");
    t.is(result.processMemory, "healthy");
  }
});

test("getHealthcheck() - unhealthy cache, unhealthy database", async (t) => {
  const getHealthcheck = createGetHealthcheck({
    cache: mockUnhealthyCache,
    healthcheckRepository: mockUnhealthyRepository,
  });

  const result = await getHealthcheck();

  t.is(result.cache, "unhealthy");
  t.is(result.database, "unhealthy");

  if (typeof process.env.CI === "undefined") {
    t.is(result.systemMemory, "healthy");
    t.is(result.processMemory, "healthy");
  }
});
