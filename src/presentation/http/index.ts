import { AppRouter, initContract } from "@ts-rest/core";
import { initServer } from "@ts-rest/fastify";

import type { HealthcheckApplication } from "../../application/healthcheck/index.js";
import {
  bindHealthcheckRoutes,
  healthcheckRouterContract,
} from "./routes/healthcheck/index.js";

const c = initContract();
const s = initServer();

const contract = {
  ...healthcheckRouterContract,
};

export const routerContract = c.router(contract);

export function createAppRouter({
  healthcheckApplication,
}: {
  healthcheckApplication: HealthcheckApplication;
}): ReturnType<typeof s.router> {
  const healthcheckRouter = bindHealthcheckRoutes({
    healthcheckApplication,
  });

  // FIXME: we should not cast here
  return s.router(contract, {
    ...healthcheckRouter,
  }) as unknown as ReturnType<typeof s.router>;
}
