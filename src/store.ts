import {
  createDependencyStore,
  DependencyStore as SdkDependencyStore,
} from "@gjuchault/typescript-service-sdk";

import type { HealthcheckApplication } from "./application/healthcheck";
import type { Repository } from "./repository";

export const createAppDependencyStore = createDependencyStore<{
  repository: Repository;
  healthcheckApplication: HealthcheckApplication;
}>;

export const dependencyStore = createAppDependencyStore();

export type DependencyStore = SdkDependencyStore<{
  repository: Repository;
  healthcheckApplication: HealthcheckApplication;
}>;
