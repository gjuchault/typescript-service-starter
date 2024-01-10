import os from "node:os";
import v8 from "node:v8";

import { DependencyStore } from "~/store";

export interface GetHealthcheckResult {
  database: "healthy" | "unhealthy";
  cache: "healthy" | "unhealthy";
  systemMemory: "healthy" | "unhealthy";
  processMemory: "healthy" | "unhealthy";
}

export async function getHealthcheck({
  dependencyStore,
}: {
  dependencyStore: DependencyStore;
}): Promise<GetHealthcheckResult> {
  const cache = dependencyStore.get("cache");
  const { healthcheck: healthcheckRepository } =
    dependencyStore.get("repository");

  const databaseResult = await healthcheckRepository.getHealthcheck();

  let cacheResult: "healthy" | "unhealthy" = "healthy";

  try {
    await cache.echo("1");
  } catch {
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
