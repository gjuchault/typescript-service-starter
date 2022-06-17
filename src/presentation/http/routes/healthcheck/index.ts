import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { HealthcheckApplication } from "../../../../application/healthcheck";
import type { HttpServer } from "../../../../infrastructure/http";

export function bindHealthcheckRoutes({
  httpServer,
  healthcheckApplication,
}: {
  httpServer: HttpServer;
  healthcheckApplication: HealthcheckApplication;
}) {
  const healthcheckResponseSchema = z.object({
    http: z.literal("healthy"),
    database: z.union([z.literal("healthy"), z.literal("unhealthy")]),
    cache: z.union([z.literal("healthy"), z.literal("unhealthy")]),
    systemMemory: z.union([z.literal("healthy"), z.literal("unhealthy")]),
    processMemory: z.union([z.literal("healthy"), z.literal("unhealthy")]),
  });

  // const querystringSchema = z.object({
  //   foo: z.string(),
  // });

  // httpServer.post(
  //   "/user",
  //   {
  //     schema: {
  //       querystring: querystringSchema,
  //       body: z.object({
  //         name: z.string(),
  //       }),
  //       response: {
  //         200: z.object({ name: z.string() }),
  //       },
  //     },
  //   },
  //   async (request, reply) => {
  //     request.query.foo;
  //     request.body.name;
  //     reply.send({
  //       name: "foo",
  //     });
  //   }
  // );

  httpServer.get(
    "/healthcheck",
    {
      schema: {
        description: "Check the status of the application",
        response: {
          200: healthcheckResponseSchema,
          500: healthcheckResponseSchema,
        },
      },
    },
    async function handler(_request, reply) {
      const healthcheck = await healthcheckApplication.getHealthcheck();

      // _request.query.foo;

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
  );
}
