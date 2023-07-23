import type {
  ServerInferResponseBody,
  ServerInferResponses,
} from "@ts-rest/core";
import { z } from "zod";

import { GetHealthcheckResult } from "../../../../application/healthcheck/get-healthcheck.js";
import type { HealthcheckApplication } from "../../../../application/healthcheck/index.js";

export type RouterGetHealthcheckResult = ServerInferResponses<
  (typeof healthcheckRouterContract)["getHealthcheck"]
>;

export type RouterGetHealthcheckBody = ServerInferResponseBody<
  (typeof healthcheckRouterContract)["getHealthcheck"]
>;

export const healthcheckRouterContract = {
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
} as const;

export function bindHealthcheckRoutes({
  healthcheckApplication,
}: {
  healthcheckApplication: HealthcheckApplication;
}) {
  return {
    async getHealthcheck(): Promise<RouterGetHealthcheckResult> {
      const healthcheck = await healthcheckApplication.getHealthcheck();

      if (!isHealthcheckFullyHealthy(healthcheck)) {
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

function isHealthcheckFullyHealthy(
  healthcheck: GetHealthcheckResult,
): healthcheck is Record<keyof GetHealthcheckResult, "healthy"> {
  return !Object.values(healthcheck).includes("unhealthy");
}
