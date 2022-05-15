import fastify from "fastify";
import circuitBreaker from "@fastify/circuit-breaker";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import etag from "@fastify/etag";
import helmet from "@fastify/helmet";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import underPressure from "under-pressure";
import ms from "ms";
import * as config from "../../config";
import { createLogger } from "../../infrastructure/logger";

const requestTimeout = ms("120s");

export async function createHttpServer() {
  const logger = createLogger("http");

  const httpServer = fastify({
    requestTimeout,
    logger,
  });

  httpServer.listen(config.port, config.address, (error) => {
    if (error !== null) {
      throw error;
    }
  });

  httpServer.register(circuitBreaker);
  httpServer.register(cookie, {
    secret: config.secret,
  });
  httpServer.register(cors);
  httpServer.register(etag);
  httpServer.register(helmet);
  httpServer.register(formbody);
  httpServer.register(multipart);
  httpServer.register(rateLimit);
  httpServer.register(underPressure);

  httpServer.get("/healthcheck", async (_request, reply) => {
    // reply.code(200).send("ok");
    throw new Error("foo");
  });

  return httpServer;
}
