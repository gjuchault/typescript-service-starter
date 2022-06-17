import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
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
import underPressure from "@fastify/under-pressure";
import {
  ContextConfigDefault,
  fastify,
  FastifyBaseLogger,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
} from "fastify";
import type { RouteGenericInterface } from "fastify/types/route";
import type { ResolveFastifyReplyType } from "fastify/types/type-provider";
import ms from "ms";
import type { ZodType } from "zod";
import { createLogger } from "../../infrastructure/logger";
import { openTelemetryPluginOptions } from "../../infrastructure/telemetry/instrumentations/fastify";
import { metricsPlugin } from "../../infrastructure/telemetry/metrics/fastify";
import {
  serializerCompiler,
  swaggerTransform,
  validatorCompiler,
  ZodTypeProvider,
} from "../../type-helpers/fastify-zod";
import { Cache } from "../cache";

export type HttpServer = FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse,
  FastifyBaseLogger,
  ZodTypeProvider
>;

export type HttpRequest = FastifyRequest<
  RouteGenericInterface,
  Server,
  RawRequestDefaultExpression<Server>,
  ZodType,
  ZodTypeProvider
>;

export type HttpReply = FastifyReply<
  Server,
  RawRequestDefaultExpression<Server>,
  RawReplyDefaultExpression<Server>,
  RouteGenericInterface,
  ContextConfigDefault,
  ZodType,
  ZodTypeProvider,
  ResolveFastifyReplyType<ZodTypeProvider, ZodType, RouteGenericInterface>
>;

const requestTimeout = ms("120s");

export async function createHttpServer({
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

  const httpServer: HttpServer = fastify({
    requestTimeout,
    logger: undefined,
    requestIdHeader: "x-request-id",
    genReqId() {
      return randomUUID();
    },
  }).withTypeProvider<ZodTypeProvider>();

  httpServer.setValidatorCompiler(validatorCompiler);
  httpServer.setSerializerCompiler(serializerCompiler);

  await httpServer.register(openTelemetryPlugin, openTelemetryPluginOptions);
  await httpServer.register(metricsPlugin);

  await httpServer.register(circuitBreaker);
  await httpServer.register(cookie, { secret });
  await httpServer.register(cors);
  await httpServer.register(etag);
  await httpServer.register(helmet);
  await httpServer.register(formbody);
  await httpServer.register(multipart);
  await httpServer.register(rateLimit, {
    redis: cache,
  });
  await httpServer.register(underPressure);

  await httpServer.register(swagger, {
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
    transform: swaggerTransform,
  });

  httpServer.setNotFoundHandler(
    {
      preHandler: (request, reply) => {
        const handler = request.server.rateLimit().bind(request.server);

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
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      },
      method: request.method,
      url: request.url,
      route: request.routerPath,
      userAgent: request.headers["user-agent"],
      responseTime: Math.ceil(reply.getResponseTime()),
      httpStatusCode: reply.statusCode,
    });
  });

  return httpServer;
}
