import { context, trace } from "@opentelemetry/api";

export function pinoMixin() {
  const span = trace.getSpan(context.active());

  if (!span) {
    return {};
  }

  const spanContext = span.spanContext();

  const record = {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
    trace_flags: `0${spanContext.traceFlags.toString(16)}`,
  };

  return record;
}
