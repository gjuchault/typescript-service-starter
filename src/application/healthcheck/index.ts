import type { Redis } from "ioredis";
import type { HealthcheckRepository } from "../../repository/healthcheck";
import type { GetHealthcheckResult } from "./get-healthcheck";
import { createGetHealthcheck } from "./get-healthcheck";

export interface HealthcheckApplication {
  getHealthcheck(): Promise<GetHealthcheckResult>;
}

export function createHealthcheckApplication({
  healthcheckRepository,
  cache,
}: {
  healthcheckRepository: HealthcheckRepository;
  cache: Redis;
}): HealthcheckApplication {
  const getHealthcheck = createGetHealthcheck({
    healthcheckRepository,
    cache,
  });

  return { getHealthcheck };
}
