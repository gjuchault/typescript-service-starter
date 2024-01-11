import type { DependencyStore } from "~/store.js";

import type { GetHealthcheckResult } from "./get-healthcheck.js";
export { getHealthcheck } from "./get-healthcheck.js";

export interface HealthcheckApplication {
  getHealthcheck(): Promise<GetHealthcheckResult>;
}

export async function startHealthcheckApplication({
  dependencyStore,
}: {
  dependencyStore: DependencyStore;
}): Promise<void> {
  const taskScheduling = dependencyStore.get("taskScheduling");

  const enqueueSomeTask = await taskScheduling.createTask<{ id: string }>(
    "someTask",
    async (job) => {
      await Promise.resolve(job.data.id);
    },
  );

  await enqueueSomeTask([{ id: "123" }]);
}
