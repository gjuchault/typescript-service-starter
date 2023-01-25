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
import underPressure from "@fastify/under-pressure";
import type { AnyRouter } from "@trpc/server";
import {
  fastifyTRPCPlugin,
  CreateFastifyContextOptions,
} from "@trpc/server/adapters/fastify";
import {
  fastify,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import ms from "ms";
import type { Config } from "../../config";
import { createLogger } from "../../infrastructure/logger";
import { openTelemetryPluginOptions } from "../../infrastructure/telemetry/instrumentations/fastify";
import { metricsPlugin } from "../../infrastructure/telemetry/metrics/fastify";
import type { Cache } from "../cache";
import type { Telemetry } from "../telemetry";

export type HttpServer = FastifyInstance;
export type HttpRequest = FastifyRequest;
export type HttpReply = FastifyReply;

const requestTimeout = ms("120s");

export async function createHttpServer({
  config,
  cache,
  telemetry,
  appRouter,
}: {
  config: Config;
  cache: Cache;
  telemetry: Telemetry;
  appRouter: AnyRouter;
}) {
  const logger = createLogger("http", { config });

  const httpServer: HttpServer = fastify({
    requestTimeout,
    logger: undefined,
    requestIdHeader: "x-request-id",
    maxParamLength: 10_000,
    genReqId() {
      return randomUUID();
    },
  });

  await httpServer.register(openTelemetryPlugin, openTelemetryPluginOptions);
  await httpServer.register(metricsPlugin, telemetry);

  await httpServer.register(circuitBreaker);
  await httpServer.register(cookie, { secret: config.secret });
  await httpServer.register(cors);
  await httpServer.register(etag);
  await httpServer.register(helmet);
  await httpServer.register(formbody);
  await httpServer.register(multipart);
  await httpServer.register(rateLimit, {
    redis: cache,
  });
  await httpServer.register(underPressure);

  await httpServer.register(fastifyTRPCPlugin, {
    prefix: "/api",
    trpcOptions: { router: appRouter, createContext },
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

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return { req, res };
}
