import {
	type Span,
	trace,
	diag,
	DiagConsoleLogger,
	DiagLogLevel,
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
import {
	ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
	ATTR_PROCESS_PID,
} from "@opentelemetry/semantic-conventions/incubating";
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

export interface Telemetry {
	shutdown(): Promise<void>;
	startDeferredSpan(spanName: string): Span;
	startActiveSpan<F extends () => unknown>(
		spanName: string,
		callback: F,
	): ReturnType<F>;
}

export function createTelemetry({
	config,
	packageJson,
}: {
	config: Pick<Config, "envName" | "otlpEndpoint">;
	packageJson: Pick<PackageJson, "name" | "version">;
}): Telemetry {
	if (config.otlpEndpoint === undefined) {
		return {
			shutdown: async () => {
				/* no-op */
			},
			startDeferredSpan(): Span {
				return {
					end() {
						/* no-op */
					},
				} as Span;
			},
			startActiveSpan<F extends () => unknown>(
				_: unknown,
				callback: F,
			): ReturnType<F> {
				return callback() as ReturnType<F>;
			},
		};
	}

	const sdk = new NodeSDK({
		resource: Resource.default().merge(
			new Resource({
				[ATTR_SERVICE_NAME]: packageJson.name,
				[ATTR_SERVICE_VERSION]: packageJson.version,
				[ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.envName,
				[ATTR_PROCESS_PID]: process.pid,
			}),
		),
		traceExporter: new OTLPTraceExporter({
			url: `${config.otlpEndpoint}/v1/traces`,
		}),
		// metricReader: new PeriodicExportingMetricReader({
		// 	exporter: new OTLPMetricExporter({
		// 		url: `${config.otlpEndpoint}/v1/metrics`,
		// 	}),
		// }),
		instrumentations: [],
	});

	sdk.start();

	const tracer = trace.getTracer(packageJson.name, packageJson.version);

	return {
		shutdown: () => sdk.shutdown(),
		startDeferredSpan(spanName) {
			return tracer.startSpan(spanName);
		},
		startActiveSpan(spanName, callback) {
			return tracer.startActiveSpan(spanName, callback);
		},
	};
}
