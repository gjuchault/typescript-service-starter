import { initTRPC } from "@trpc/server";

import type { HealthcheckApplication } from "../../application/healthcheck/index.js";
import { bindHealthcheckRoutes } from "./routes/healthcheck/index.js";

export type AppRouter = ReturnType<typeof createAppRouter>;
export type RootRouter = ReturnType<typeof initTRPC.create>;

export function createAppRouter({
  healthcheckApplication,
}: {
  healthcheckApplication: HealthcheckApplication;
}) {
  const t = initTRPC.create();

  const healthcheckRouter = bindHealthcheckRoutes({
    t,
    healthcheckApplication,
  });

  return t.router({
    healthcheck: healthcheckRouter,
  });
}
