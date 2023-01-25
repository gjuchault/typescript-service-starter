import { z } from "zod";
import type { HealthcheckApplication } from "../../../../application/healthcheck";
import type { RootRouter } from "../../index";

const healthcheckResponseSchema = z.object({
  http: z.literal("healthy"),
  database: z.union([z.literal("healthy"), z.literal("unhealthy")]),
  cache: z.union([z.literal("healthy"), z.literal("unhealthy")]),
  systemMemory: z.union([z.literal("healthy"), z.literal("unhealthy")]),
  processMemory: z.union([z.literal("healthy"), z.literal("unhealthy")]),
});

export type HealthcheckResponseSchema = z.infer<
  typeof healthcheckResponseSchema
>;

export function bindHealthcheckRoutes({
  t,
  healthcheckApplication,
}: {
  t: RootRouter;
  healthcheckApplication: HealthcheckApplication;
}) {
  return t.router({
    healthcheck: t.procedure
      .output(healthcheckResponseSchema)
      .query(async () => {
        const healthcheck = await healthcheckApplication.getHealthcheck();

        return {
          ...healthcheck,
          http: "healthy",
        };
      }),
  });
}
