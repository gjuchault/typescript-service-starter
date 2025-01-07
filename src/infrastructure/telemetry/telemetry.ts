import {
	type Attributes,
	type Context,
	type SpanContext,
	type SpanOptions,
	SpanStatusCode,
	context,
	trace,
} from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { ATTR_PROCESS_PID } from "@opentelemetry/semantic-conventions/incubating";
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";
import { createLogger } from "../logger/logger.ts";

export interface Span {
	setAttributes(attributes: Attributes): Span;
	setStatus({ code }: { code: SpanStatusCode }): void;
	end(): void;
}

export interface SpanPayload {
	spanName: string;
	context?: Context;
	options?: SpanOptions | undefined;
}

export interface Telemetry {
	shutdown(): Promise<void>;
	startSpan(payload: SpanPayload & { forceActive?: boolean }): Span;
	startSpanWith<Output>(
		payload: SpanPayload,
		callback: (span: Span) => Promise<Output>,
	): Promise<Output>;
}

export const mockSpan: Span = {
	end() {
		/* no-op */
	},
	setStatus() {
		/* no-op */
	},
	setAttributes() {
		return mockSpan;
	},
};

export const mockTelemetry: Telemetry = {
	shutdown: async () => {
		/* no-op */
	},
	startSpan(_: SpanPayload): Span {
		return mockSpan;
	},
	async startSpanWith(_, callback) {
		return await callback(mockSpan);
	},
};

export function createTelemetry({
	config,
	packageJson,
}: {
	config: Pick<
		Config,
		"logLevel" | "otlpTraceEndpoint" | "otlpMetricsEndpoint"
	>;
	packageJson: Pick<PackageJson, "name" | "version">;
}): Telemetry {
	const logger = createLogger("telemetry", { config, packageJson });

	if (config.otlpTraceEndpoint === undefined) {
		logger.debug("otlp trace endpoint not configured, telemetry disabled");

		return mockTelemetry;
	}

	const sdk = new NodeSDK({
		resource: Resource.default().merge(
			new Resource({
				[ATTR_SERVICE_NAME]: packageJson.name,
				[ATTR_SERVICE_VERSION]: packageJson.version,
				[ATTR_PROCESS_PID]: process.pid,
			}),
		),
		traceExporter: new OTLPTraceExporter({
			url: `${config.otlpTraceEndpoint}/v1/traces`,
		}),
		...(config.otlpMetricsEndpoint
			? {
					metricReader: new PeriodicExportingMetricReader({
						exporter: new OTLPMetricExporter({
							url: `${config.otlpMetricsEndpoint}/v1/metrics`,
						}),
					}),
				}
			: {}),
		instrumentations: [],
	});

	sdk.start();

	logger.info("telemetry started");

	const tracer = trace.getTracer(packageJson.name, packageJson.version);

	return {
		shutdown: () => sdk.shutdown(),
		startSpan(payload) {
			const span = tracer.startSpan(payload.spanName, payload.options);

			return span;
		},
		async startSpanWith(payload, callback) {
			const parentContext = payload.context ?? context.active();
			const span = tracer.startSpan(
				payload.spanName,
				payload.options,
				parentContext,
			);

			const contextWithSpanSet = trace.setSpan(parentContext, span);

			return await context.with(
				contextWithSpanSet,
				async function subCallback() {
					try {
						const result = await callback(span);
						span.setStatus({ code: SpanStatusCode.OK });

						return result;
					} catch (err) {
						span.setStatus({
							code: SpanStatusCode.ERROR,
							message:
								typeof err === "object" && err !== null && "message" in err
									? String(err.message)
									: String(err),
						});
						throw err;
					} finally {
						span.end();
					}
				},
				undefined,
				span,
			);
		},
	};
}
