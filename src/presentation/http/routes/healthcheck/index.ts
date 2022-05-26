import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { HealthcheckApplication } from "../../../../application/healthcheck";

export function bindHealthcheckRoutes({
  httpServer,
  healthcheckApplication,
}: {
  httpServer: FastifyInstance;
  healthcheckApplication: HealthcheckApplication;
}) {
  const healthcheckResponseSchema = z.object({
    http: z.literal("healthy"),
    database: z.union([z.literal("healthy"), z.literal("unhealthy")]),
    cache: z.union([z.literal("healthy"), z.literal("unhealthy")]),
    systemMemory: z.union([z.literal("healthy"), z.literal("unhealthy")]),
    processMemory: z.union([z.literal("healthy"), z.literal("unhealthy")]),
  });

  async function getHealthcheck(_request: FastifyRequest, reply: FastifyReply) {
    const healthcheck = await healthcheckApplication.getHealthcheck();

    let status = 200;
    for (const value of Object.values(healthcheck)) {
      if (value !== "healthy") {
        status = 500;
        break;
      }
    }

    reply.code(status).send({
      ...healthcheck,
      http: "healthy",
    });
  }

  httpServer.get(
    "/healthcheck",
    {
      schema: {
        response: {
          200: {
            description: "Check the status of the application",
            ...zodToJsonSchema(healthcheckResponseSchema),
          },
        },
      },
    },
    getHealthcheck
  );
}
