import type { Cache } from "../../infrastructure/cache";
import type { TaskScheduling } from "../../infrastructure/task-scheduling";
import type { HealthcheckRepository } from "../../repository/healthcheck";
import type { GetHealthcheckResult } from "./get-healthcheck";
import { getHealthcheck } from "./get-healthcheck";

export interface HealthcheckApplication {
  getHealthcheck(): Promise<GetHealthcheckResult>;
}

export async function createHealthcheckApplication({
  healthcheckRepository,
  taskScheduling,
  cache,
}: {
  healthcheckRepository: HealthcheckRepository;
  taskScheduling: TaskScheduling;
  cache: Cache;
}): Promise<HealthcheckApplication> {
  const enqueueSomeTask = await taskScheduling.createTask<{ id: string }>(
    "someTask",
    async (job) => {
      await Promise.resolve(job.data.id);
    }
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
