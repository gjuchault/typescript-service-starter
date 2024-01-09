import type {
  Cache,
  DependencyStore,
  TaskScheduling,
} from "@gjuchault/typescript-service-sdk";

import type { Repository } from "~/repository/index.js";

import type { GetHealthcheckResult } from "./get-healthcheck.js";
import { getHealthcheck } from "./get-healthcheck.js";

export interface HealthcheckApplication {
  getHealthcheck(): Promise<GetHealthcheckResult>;
}

export async function createHealthcheckApplication({
  dependencyStore,
}: {
  dependencyStore: DependencyStore;
}): Promise<HealthcheckApplication> {
  const taskScheduling =
    dependencyStore.retrieve<TaskScheduling>("taskScheduling");
  const cache = dependencyStore.retrieve<Cache>("cache");
  const { healthcheck: healthcheckRepository } =
    dependencyStore.retrieve<Repository>("repository");

  const enqueueSomeTask = await taskScheduling.createTask<{ id: string }>(
    "someTask",
    async (job) => {
      await Promise.resolve(job.data.id);
    },
  );

  await enqueueSomeTask([{ id: "123" }]);

  return {
    async getHealthcheck() {
      return getHealthcheck({
        cache,
        healthcheckRepository,
      });
    },
  };
}
