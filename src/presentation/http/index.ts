import type { HealthcheckApplication } from "../../application/healthcheck";
import type { HttpServer } from "../../infrastructure/http";
import { bindHealthcheckRoutes } from "./routes/healthcheck";

export function bindHttpRoutes({
  httpServer,
  healthcheckApplication,
}: {
  httpServer: HttpServer;
  healthcheckApplication: HealthcheckApplication;
}) {
  httpServer.get(
    "/docs",
    {
      schema: {
        response: {
          200: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {},
            additionalProperties: true,
            description: "OpenAPI 3.0 Documentation",
          },
        },
      },
    },
    (_request, reply) => {
      reply.send(httpServer.swagger());
    }
  );

  bindHealthcheckRoutes({ httpServer, healthcheckApplication });
}
