import * as opentelemetry from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import {
  ConsoleSpanExporter,
  InMemorySpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { context, trace } from "@opentelemetry/api";
import * as config from "../config";

export interface Metrics {
  getTracer(): opentelemetry.api.Tracer;
  startSpan<TResolved>(
    name: string,
    options: opentelemetry.api.SpanOptions | undefined,
    callback: StartSpanCallback<TResolved>
  ): Promise<TResolved>;
}

type StartSpanCallback<TResolved> = (
  span: opentelemetry.api.Span
) => Promise<TResolved> | TResolved;

export async function startMetrics(): Promise<Metrics> {
  let traceExporter: opentelemetry.tracing.SpanExporter =
    new InMemorySpanExporter();

  if (config.env === "production") {
    traceExporter = new ConsoleSpanExporter();
  }

  const sdk = new opentelemetry.NodeSDK({
    traceExporter,
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

          span.end();

          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  return {
    getTracer,
    startSpan,
  };

  // registerInstrumentations({
  //   instrumentations: [
  //     new PinoInstrumentation(),
  //     new PgInstrumentation(),

  //     new HttpInstrumentation(),
  //     new FastifyInstrumentation(),
  //   ],
  // });
}
