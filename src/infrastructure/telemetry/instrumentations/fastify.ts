import { context, trace, SpanKind } from "@opentelemetry/api";
import {
  NetTransportValues,
  SemanticAttributes,
} from "@opentelemetry/semantic-conventions";
import { FastifyInstance, FastifyRequest } from "fastify";
import { Telemetry } from "..";
import * as config from "../../../config";

export function buildFastifyTracePlugin({
  telemetry,
}: {
  telemetry: Telemetry;
}) {
  function fastifyTracePlugin(fastify: FastifyInstance) {
    fastify.addHook("onRequest", (request, _reply, done) => {
      const headers = request.headers;
      const userAgent = headers["user-agent"];
      const ips = headers["x-forwarded-for"];
      const httpVersion = request.raw.httpVersion;
      const requestUrl = new URL(request.url);
      const requestId = getRequestId(request);

      const target = requestUrl.pathname ?? "/";
      const pathname = request.routerPath ?? target;
      const clientIp = typeof ips === "string" ? ips.split(",")[0] : undefined;
      const netTransport =
        httpVersion === "QUIC"
          ? NetTransportValues.IP_UDP
          : NetTransportValues.IP_TCP;

      const tracer = telemetry.getTracer();
      const span = tracer.startSpan(`${request.method} ${pathname}`, {
        kind: SpanKind.SERVER,
        root: true,
        attributes: {
          [SemanticAttributes.HTTP_URL]: requestUrl.toString(),
          [SemanticAttributes.HTTP_HOST]: requestUrl.host,
          [SemanticAttributes.NET_HOST_NAME]: requestUrl.hostname,
          [SemanticAttributes.HTTP_METHOD]: request.method,
          [SemanticAttributes.HTTP_ROUTE]: pathname,
          [SemanticAttributes.HTTP_CLIENT_IP]: clientIp,
          [SemanticAttributes.HTTP_TARGET]: target,
          [SemanticAttributes.HTTP_USER_AGENT]: userAgent,
          [SemanticAttributes.HTTP_FLAVOR]: httpVersion,
          [SemanticAttributes.HTTP_SERVER_NAME]: config.name,
          [SemanticAttributes.NET_TRANSPORT]: netTransport,
          ...getRequestContentLength(request),
        },
      });
      const spanContext = trace.getSpanContext(context.active());
      if (spanContext) {
        spanContext.traceId = requestId ?? spanContext.traceId;
      }

      const traceContext = trace.setSpan(context.active(), span);

      return context.with(traceContext, () => {
        done();
      });
    });
  }

  function getRequestContentLength(
    request: FastifyRequest
  ): Record<string, number> | undefined {
    const length = Number(request.headers["content-length"]);

    if (length === undefined || !Number.isSafeInteger(length)) {
      return;
    }

    const isRequestCompressed =
      request.headers["content-encoding"] !== undefined &&
      request.headers["content-encoding"] !== "identity";

    const attribute = isRequestCompressed
      ? SemanticAttributes.HTTP_RESPONSE_CONTENT_LENGTH
      : SemanticAttributes.HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED;

    return {
      [attribute]: length,
    };
  }

  return fastifyTracePlugin;
}

function getRequestId(request: FastifyRequest): string | undefined {
  const headerNames: string[] = [
    "x-request-id",
    "x-trace-id",
    "x-correlation-id",
    "request-id",
    "trace-id",
    "correlation-id",
  ];

  for (const headerName of headerNames) {
    const headerValue = request.headers[headerName];
    if (headerValue !== undefined) {
      if (typeof headerValue === "string") {
        return headerValue;
      } else {
        return headerValue[0];
      }
    }
  }

  return undefined;
}
