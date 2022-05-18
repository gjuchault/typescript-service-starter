import { context, SpanStatusCode, trace } from "@opentelemetry/api";
import { TraceIdRatioBasedSampler } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import * as opentelemetry from "@opentelemetry/sdk-node";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { config } from "../../config";
import { pinoSpanExporter } from "./pinoExporter";

export interface Telemetry {
  getTracer(): opentelemetry.api.Tracer;
  startSpan<TResolved>(
    name: string,
    options: opentelemetry.api.SpanOptions | undefined,
    callback: StartSpanCallback<TResolved>
  ): Promise<TResolved>;
  shutdown(): Promise<void>;
}

type StartSpanCallback<TResolved> = (
  span: opentelemetry.api.Span
) => Promise<TResolved> | TResolved;

export async function createTelemetry(): Promise<Telemetry> {
  let traceExporter: opentelemetry.tracing.SpanExporter =
    new InMemorySpanExporter();

  if (config.env === "production") {
    traceExporter = pinoSpanExporter;
  }

  const sdk = new opentelemetry.NodeSDK({
    traceExporter,
    sampler: new TraceIdRatioBasedSampler(1),
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.name,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.env,
      [SemanticResourceAttributes.PROCESS_PID]: process.pid,
    }),
    autoDetectResources: true,
  });

  await sdk.start();

  function getTracer(): opentelemetry.api.Tracer {
    return trace.getTracer(config.name, config.version);
  }

  async function startSpan<TResolved>(
    name: string,
    options: opentelemetry.api.SpanOptions | undefined,
    callback: StartSpanCallback<TResolved>
  ): Promise<TResolved> {
    const span = getTracer().startSpan(name, options);
    const traceContext = trace.setSpan(context.active(), span);

    return new Promise<TResolved>((resolve, reject) => {
      context.with(traceContext, async () => {
        try {
          const result: TResolved = await callback(span);

          span.setStatus({ code: SpanStatusCode.OK });

          resolve(result);
        } catch (error) {
          if (error instanceof Error) {
            span.recordException(error);
          }

          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: getErrorMessage(error),
          });
          reject(error);
        } finally {
          span.end();
        }
      });
    });
  }

  async function shutdown() {
    await sdk.shutdown();
  }

  return {
    getTracer,
    startSpan,
    shutdown,
  };
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "telemetry: unkwown error";
}
