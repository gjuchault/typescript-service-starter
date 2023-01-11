import type { HealthcheckApplication } from "../../../../application/healthcheck";
import type { RootRouter } from "../../index";

export function bindHealthcheckRoutes({
  t,
  healthcheckApplication,
}: {
  t: RootRouter;
  healthcheckApplication: HealthcheckApplication;
}) {
  return t.router({
    healthcheck: t.procedure.query(async () => {
      const healthcheck = await healthcheckApplication.getHealthcheck();

      return {
        ...healthcheck,
        http: "healthy",
      };
    }),
  });
}
