import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { HealthcheckApplication } from "../../../../application/healthcheck";

export function bindHealthcheckRoutes({
  httpServer,
  healthcheckApplication,
}: {
  httpServer: FastifyInstance;
  healthcheckApplication: HealthcheckApplication;
}) {
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

  httpServer.get("/healthcheck", getHealthcheck);
}
