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

  httpServer.post(
    "/user/:id",
    {
      schema: {
        description: "Check the status of the application",
        params: zodToJsonSchema(
          z.object({
            id: z.string(),
          })
        ),
        querystring: zodToJsonSchema(
          z.object({
            includeFoo: z.string(),
          })
        ),
        body: zodToJsonSchema(
          z.object({
            foo: z.string(),
            bar: z.string().default("bar"),
          })
        ),
      },
    },
    async (_, rep) => rep.send()
  );

  httpServer.get(
    "/healthcheck",
    {
      schema: {
        description: "Check the status of the application",
        params: zodToJsonSchema(
          z.object({
            id: z.string(),
          })
        ),
        body: zodToJsonSchema(
          z.object({
            foo: z.string(),
            bar: z.string().default("bar"),
          })
        ),
        response: {
          200: zodToJsonSchema(healthcheckResponseSchema),
        },
      },
    },
    getHealthcheck
  );
}
