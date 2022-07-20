import { Meter, ValueType } from "@opentelemetry/api-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

const ignoredPaths = new Set<string>();

export const metricsPlugin = fp(innerMetricsPlugin);

function innerMetricsPlugin(
  httpServer: FastifyInstance,
  options: {
    readonly metrics: Meter;
    readonly metricReader: PrometheusExporter;
  },
  done: () => void
) {
  const { metrics, metricReader } = options;

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
    if (request.method === "head" || ignoredPaths.has(request.routerPath)) {
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
