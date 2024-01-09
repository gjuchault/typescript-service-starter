import type { Database } from "@gjuchault/typescript-service-sdk";

import type { HealthcheckRepository } from "./healthcheck/index.js";
import { createHealthcheckRepository } from "./healthcheck/index.js";

export type Repository = {
  healthcheck: HealthcheckRepository;
};

export function createRepository({
  database,
}: {
  database: Database;
}): Repository {
  return {
    healthcheck: createHealthcheckRepository({
      database,
    }),
  };
}
