import type { Cache } from "../../infrastructure/cache";
import type { HealthcheckRepository } from "../../repository/healthcheck";
import type { GetHealthcheckResult } from "./getHealthcheck";
import { createGetHealthcheck } from "./getHealthcheck";

export interface HealthcheckApplication {
  getHealthcheck(): Promise<GetHealthcheckResult>;
}

export function createHealthcheckApplication({
  healthcheckRepository,
  cache,
}: {
  healthcheckRepository: HealthcheckRepository;
  cache: Cache;
}): HealthcheckApplication {
  const getHealthcheck = createGetHealthcheck({
    healthcheckRepository,
    cache,
  });

  return { getHealthcheck };
}
