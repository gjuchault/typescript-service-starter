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
import type { Config } from "../../config";
import { createLogger } from "../../infrastructure/logger";
import { openTelemetryPluginOptions } from "../../infrastructure/telemetry/instrumentations/fastify";
import { metricsPlugin } from "../../infrastructure/telemetry/metrics/fastify";
import type { Cache } from "../cache";
import type { Telemetry } from "../telemetry";
import {
  serializerCompiler,
  swaggerTransform,
  validatorCompiler,
  ZodTypeProvider,
} from "./fastify-zod";

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
  RawRequestDefaultExpression,
  ZodType,
  ZodTypeProvider
>;

export type HttpReply = FastifyReply<
  Server,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
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
  telemetry,
}: {
  config: Config;
  cache: Cache;
  telemetry: Telemetry;
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
  await httpServer.register(metricsPlugin, telemetry);

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
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      preHandler: httpServer.rateLimit(),
    },
    function (_request, reply) {
      void reply.code(404).send();
    }
  );

  httpServer.addHook("onRequest", (request, _response, done) => {
    logger.debug(`http request: ${request.method} ${request.url}`, {
      requestId: getRequestId(request),
      method: request.method,
      url: request.url,
      route: request.routerPath,
      userAgent: request.headers["user-agent"],
    });

    done();
  });

  httpServer.addHook("onResponse", (request, reply, done) => {
    logger.debug(
      `http reply: ${request.method} ${request.url} ${reply.statusCode}`,
      {
        requestId: getRequestId(request),
        method: request.method,
        url: request.url,
        route: request.routerPath,
        userAgent: request.headers["user-agent"],
        responseTime: Math.ceil(reply.getResponseTime()),
        httpStatusCode: reply.statusCode,
      }
    );

    done();
  });

  httpServer.addHook("onError", (request, reply, error, done) => {
    logger.error(`http error (${error.code}): ${error.name} ${error.message}`, {
      requestId: getRequestId(request),
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

    done();
  });

  return httpServer;
}

function getRequestId(request: FastifyRequest): string | undefined {
  if (typeof request.id === "string") {
    return request.id;
  }

  return undefined;
}
