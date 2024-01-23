import os from "node:os";
import v8 from "node:v8";

import type { DependencyStore } from "~/store";

export interface GetHealthcheckResult {
  database: "healthy" | "unhealthy";
  cache: "healthy" | "unhealthy";
  systemMemory: "healthy" | "unhealthy";
  processMemory: "healthy" | "unhealthy";
}

export async function getHealthcheck({
  dependencyStore,
  requestId,
}: {
  dependencyStore: DependencyStore;
  requestId: string;
}): Promise<GetHealthcheckResult> {
  const createLogger = dependencyStore.get("logger");
  const cache = dependencyStore.get("cache");
  const repository = dependencyStore.get("healthcheckRepository");

  const logger = createLogger("application/healthcheck/get-healthcheck");

  const databaseResult = await repository.getHealthcheck({
    dependencyStore,
    requestId,
  });

  let cacheResult: "healthy" | "unhealthy" = "healthy";

  try {
    await cache.echo("1");
  } catch (error) {
    logger.error("Cache is unhealthy", { error, requestId });
    cacheResult = "unhealthy";
  }

  const systemMemoryUsage = os.freemem() / os.totalmem();

  const v8HeapStatistics = v8.getHeapStatistics();
  const processMemoryUsage =
    v8HeapStatistics.total_heap_size / v8HeapStatistics.heap_size_limit;

  return {
    database: databaseResult.match(
      () => "healthy",
      () => "unhealthy",
    ),
    cache: cacheResult,
    systemMemory: systemMemoryUsage > 0.8 ? "unhealthy" : "healthy",
    processMemory: processMemoryUsage > 0.8 ? "unhealthy" : "healthy",
  };
}
