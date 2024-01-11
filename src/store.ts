import {
  createDependencyStore,
  DependencyStore as SdkDependencyStore,
} from "@gjuchault/typescript-service-sdk";

import type { HealthcheckRepository } from "./repository/healthcheck/index.js";
import type { UserRepository } from "./repository/user/index.js";

type ExtraDependencies = {
  healthcheckRepository: HealthcheckRepository;
  userRepository: UserRepository;
};

export const createAppDependencyStore =
  createDependencyStore<ExtraDependencies>;

export const dependencyStore = createAppDependencyStore();

export type DependencyStore = SdkDependencyStore<ExtraDependencies>;
