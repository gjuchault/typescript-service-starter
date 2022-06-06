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
import swagger from "@fastify/swagger";
import { fastify, FastifyInstance } from "fastify";
import ms from "ms";
import underPressure from "under-pressure";
import { createLogger } from "../../infrastructure/logger";
import { openTelemetryPluginOptions } from "../../infrastructure/telemetry/instrumentations/fastify";
import { metricsPlugin } from "../../infrastructure/telemetry/metrics/fastify";
import { Cache } from "../cache";

export type HttpServer = FastifyInstance;

const requestTimeout = ms("120s");

export function createHttpServer({
  config: { secret, name, version, description },
  cache,
}: {
  config: {
    secret: string;
    name: string;
    version: string;
    description: string;
  };
  cache: Cache;
}) {
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
  httpServer.register(metricsPlugin);

  httpServer.register(circuitBreaker);
  httpServer.register(cookie, { secret });
  httpServer.register(cors);
  httpServer.register(etag);
  httpServer.register(helmet);
  httpServer.register(formbody);
  httpServer.register(multipart);
  httpServer.register(rateLimit, {
    redis: cache,
  });
  httpServer.register(underPressure);

  httpServer.setNotFoundHandler(
    {
      preHandler: (request, reply) => {
        const handler = request.server.rateLimit().bind(httpServer);

        return handler(request, reply);
      },
    },
    function (_request, reply) {
      reply.code(404).send();
    }
  );

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

  httpServer.register(swagger, {
    routePrefix: "/docs",
    openapi: {
      info: {
        title: name,
        description,
        version,
      },
      externalDocs: {
        url: "https://example.com/docs",
        description: "More documentation",
      },
      tags: [],
    },
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
    staticCSP: true,
  });

  return httpServer;
}
