import { type RouterImplementation } from "@gjuchault/typescript-service-sdk";
import { type AppRoute } from "@ts-rest/core";
import { z } from "zod";

import type { HealthcheckApplication } from "../../../../application/healthcheck/index.js";

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

export const healthcheckRouterContract: Record<"getHealthcheck", AppRoute> = {
  getHealthcheck: {
    method: "GET",
    path: "/healthcheck",
    responses: {
      200: z.object({
        database: z.literal("healthy"),
        cache: z.literal("healthy"),
        systemMemory: z.literal("healthy"),
        processMemory: z.literal("healthy"),
        http: z.literal("healthy"),
      }),
      500: z.object({
        database: z.union([z.literal("healthy"), z.literal("unhealthy")]),
        cache: z.union([z.literal("healthy"), z.literal("unhealthy")]),
        systemMemory: z.union([z.literal("healthy"), z.literal("unhealthy")]),
        processMemory: z.union([z.literal("healthy"), z.literal("unhealthy")]),
        http: z.union([z.literal("healthy"), z.literal("unhealthy")]),
      }),
    },
    summary: "Healthcheck information",
  },
};

export function bindHealthcheckRoutes({
  healthcheckApplication,
}: {
  healthcheckApplication: HealthcheckApplication;
}): RouterImplementation<typeof healthcheckRouterContract> {
  return {
    async getHealthcheck() {
      const healthcheck = await healthcheckApplication.getHealthcheck();

      const hasFailingHealthcheck =
        Object.values(healthcheck).includes("unhealthy");

      if (hasFailingHealthcheck) {
        return {
          status: 500,
          body: {
            ...healthcheck,
            http: "healthy",
          },
        };
      }

      return {
        status: 200,
        body: {
          ...healthcheck,
          http: "healthy",
        },
      };
    },
  };
}
