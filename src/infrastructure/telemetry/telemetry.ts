import {
	type Attributes,
	type Context,
	context,
	type SpanOptions,
	SpanStatusCode,
	trace,
} from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { containerDetector } from "@opentelemetry/resource-detector-container";
import {
	envDetector,
	hostDetector,
	osDetector,
	processDetector,
	serviceInstanceIdDetector,
} from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { flow, type GenError, gen } from "ts-flowgen";
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";
import { createLogger } from "../logger/logger.ts";
import { createNodeMetrics } from "./node-metrics/index.ts";

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

export type Telemetry = {
	shutdown(): AsyncGenerator<unknown, void>;
	startSpan(payload: SpanPayload & { forceActive?: boolean }): Span;
	startSpanWith<Output, Err>(
		payload: SpanPayload,
		callback: (span: Span) => AsyncGenerator<Err, Output>,
	): AsyncGenerator<Err, Output>;
};

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
	shutdown: async function* () {
		/* no-op */
	},
	startSpan(_: SpanPayload): Span {
		return mockSpan;
	},
	startSpanWith(_, callback) {
		return callback(mockSpan);
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

	const metricReader = config.otlpMetricsEndpoint
		? new PeriodicExportingMetricReader({
				// If you push to prometheus, you probably want to use the prometheus exporter instead
				exporter: new OTLPMetricExporter({
					url: `${config.otlpMetricsEndpoint}/api/v1/otlp/v1/metrics`,
				}),
				exportIntervalMillis: 10_000,
			})
		: undefined;

	const sdk = new NodeSDK({
		resourceDetectors: [
			envDetector,
			processDetector,
			containerDetector,
			osDetector,
			hostDetector,
			serviceInstanceIdDetector,
		],
		traceExporter: new OTLPTraceExporter({
			url: `${config.otlpTraceEndpoint}/v1/traces`,
		}),
		...(metricReader ? { metricReader } : {}),
		instrumentations: [],
	});

	sdk.start();

	createNodeMetrics({
		eventLoopMonitoringPrecision: 10,
		prefix: "app_",
		labels: {
			version: packageJson.version,
		},
	});

	logger.info("telemetry started");

	const tracer = trace.getTracer(packageJson.name, packageJson.version);

	return {
		shutdown: gen(() => sdk.shutdown()),
		startSpan(payload) {
			const span = tracer.startSpan(payload.spanName, payload.options);

			return span;
		},
		startSpanWith(payload, callback) {
			console.log("startSpanWith", payload);
			const parentContext = payload.context ?? context.active();
			const span = tracer.startSpan(
				payload.spanName,
				payload.options,
				parentContext,
			);

			const contextWithSpanSet = trace.setSpan(parentContext, span);

			async function wrapper() {
				return await context.with(contextWithSpanSet, async () => {
					const result = await flow(async function* () {
						const data = yield* callback(span);
						return data;
					});

					if (result.ok === false) {
						const err = result.error;
						span.setStatus({
							code: SpanStatusCode.ERROR,
							message:
								typeof err === "object" && err !== null && "message" in err
									? String(err.message)
									: String(err),
						});
						span.end();

						throw err;
					} else {
						span.setStatus({ code: SpanStatusCode.OK });
						span.end();

						return result.value;
					}
				});
			}

			return gen(
				wrapper,
				(err) => err as GenError<ReturnType<typeof callback>>,
			)();
		},
	};
}
