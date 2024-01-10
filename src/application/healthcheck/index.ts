import { DependencyStore } from "~/store.js";

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
  const taskScheduling = dependencyStore.get("taskScheduling");

  const enqueueSomeTask = await taskScheduling.createTask<{ id: string }>(
    "someTask",
    async (job) => {
      await Promise.resolve(job.data.id);
    },
  );

  await enqueueSomeTask([{ id: "123" }]);

  return {
    async getHealthcheck() {
      return getHealthcheck({ dependencyStore });
    },
  };
}
