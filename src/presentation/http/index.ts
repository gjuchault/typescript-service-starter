import { randomUUID } from "node:crypto";
import openTelemetryPlugin from "@autotelic/fastify-opentelemetry";
import circuitBreaker from "@fastify/circuit-breaker";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import etag from "@fastify/etag";
import formbody from "@fastify/formbody";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { fastify, FastifyInstance } from "fastify";
import ms from "ms";
import underPressure from "under-pressure";
import * as config from "../../config";
import { createLogger } from "../../infrastructure/logger";
import { openTelemetryPluginOptions } from "../../infrastructure/telemetry/instrumentations/fastify";

export type HttpServer = FastifyInstance;

const requestTimeout = ms("120s");

export function createHttpServer() {
  const logger = createLogger("http");

  const httpServer = fastify({
    requestTimeout,
    logger: undefined,
    requestIdHeader: "x-request-id",
    genReqId() {
      return randomUUID();
    },
  });

  httpServer.register(openTelemetryPlugin, openTelemetryPluginOptions);

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

  httpServer.addHook("onRequest", async (request) => {
    logger.debug(`http request: ${request.method} ${request.url}`, {
      requestId: request.id,
      method: request.method,
      url: request.url,
      route: request.routerPath,
      userAgent: request.headers["user-agent"],
    });
  });

  httpServer.addHook("onResponse", async (request, reply) => {
    logger.debug(
      `http reply: ${request.method} ${request.url} ${reply.statusCode}`,
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        route: request.routerPath,
        userAgent: request.headers["user-agent"],
        responseTime: Math.ceil(reply.getResponseTime()),
        httpStatusCode: reply.statusCode,
      }
    );
  });

  httpServer.addHook("onError", async (request, reply, error) => {
    logger.error(`http error: ${error}`, {
      requestId: request.id,
      error,
      method: request.method,
      url: request.url,
      route: request.routerPath,
      userAgent: request.headers["user-agent"],
      responseTime: Math.ceil(reply.getResponseTime()),
      httpStatusCode: reply.statusCode,
    });
  });

  httpServer.listen(config.port, config.address, (error, address) => {
    if (error !== null) {
      throw error;
    }

    logger.info(`server listening on ${address}`);
  });

  return httpServer;
}
