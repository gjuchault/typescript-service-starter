import { ValueType } from "@opentelemetry/api-metrics";
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { metrics, metricReader } from "..";

const ignoredPaths: string[] = [];

export const metricsPlugin = fp(innerMetricsPlugin);

function innerMetricsPlugin(
  httpServer: FastifyInstance,
  _options: FastifyPluginOptions,
  done: () => void
) {
  httpServer.get("/metrics", (request, reply) => {
    metricReader.getMetricsRequestHandler(request.raw, reply.raw);
  });

  const httpRequestDurationMicroseconds = metrics.createHistogram(
    "http_request_duration_seconds",
    {
      description: "Duration of HTTP requests in microseconds",
      unit: "milliseconds",
      valueType: ValueType.DOUBLE,
    }
  );

  const durationMap = new WeakMap<FastifyRequest, number>();

  httpServer.addHook("onRequest", (request, _reply, done) => {
    if (
      request.method === "head" ||
      ignoredPaths.includes(request.routerPath)
    ) {
      return done();
    }

    durationMap.set(request, Date.now());
    done();
  });

  httpServer.addHook("onResponse", (request, reply, done) => {
    const requestStarted = durationMap.get(request);

    if (requestStarted === undefined) {
      return done();
    }

    httpRequestDurationMicroseconds.record(
      (Date.now() - requestStarted) / 1000,
      {
        httpMethod: request.method,
        httpRoute: request.routerPath,
      }
    );

    done();
  });

  done();
}
