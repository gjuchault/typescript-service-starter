import { DependencyStore } from "~/store.js";

import type { HealthcheckRepository } from "./healthcheck/index.js";
import { createHealthcheckRepository } from "./healthcheck/index.js";
import type { UserRepository } from "./user/index.js";
import { createUserRepository } from "./user/index.js";

export type Repository = {
  healthcheck: HealthcheckRepository;
  user: UserRepository;
};

export function createRepository({
  dependencyStore,
}: {
  dependencyStore: DependencyStore;
}): Repository {
  return {
    healthcheck: createHealthcheckRepository({
      dependencyStore,
    }),
    user: createUserRepository({ dependencyStore }),
  };
}
