import { monitorEventLoopDelay } from "node:perf_hooks";
import type { Meter } from "@opentelemetry/api";
import type { MonitorOptions } from "./index.ts";

export function monitorEventLoopLag(
	nodeMetrics: Meter,
	{ prefix, labels, eventLoopMonitoringPrecision }: MonitorOptions,
): void {
	const nodejsEventLoopLag = "nodejs_eventloop_lag_seconds";
	const nodejsEventLoopLagMin = "nodejs_eventloop_lag_min_seconds";
	const nodejsEventLoopLagMax = "nodejs_eventloop_lag_max_seconds";
	const nodejsEventLoopLagMean = "nodejs_eventloop_lag_mean_seconds";
	const nodejsEventLoopLagStddev = "nodejs_eventloop_lag_stddev_seconds";
	const nodejsEventLoopLagP50 = "nodejs_eventloop_lag_p50_seconds";
	const nodejsEventLoopLagP90 = "nodejs_eventloop_lag_p90_seconds";
	const nodejsEventLoopLagP99 = "nodejs_eventloop_lag_p99_seconds";

	const eventLoopDelayMonitor = monitorEventLoopDelay({
		resolution: eventLoopMonitoringPrecision,
	});
	eventLoopDelayMonitor.enable();

	nodeMetrics
		.createObservableGauge(prefix + nodejsEventLoopLag, {
			description: "Lag of event loop in seconds.",
		})
		.addCallback(async (observable) => {
			const startTime = process.hrtime();
			await new Promise((resolve) => setImmediate(() => resolve(undefined)));
			const delta = process.hrtime(startTime);
			const seconds = delta[0] + delta[1] / 1e9;
			observable.observe(seconds, labels);
		});

	nodeMetrics
		.createObservableGauge(prefix + nodejsEventLoopLagMin, {
			description: "The minimum recorded event loop delay.",
		})
		.addCallback((observable) => {
			observable.observe(eventLoopDelayMonitor.min / 1e9, labels);
		});

	nodeMetrics
		.createObservableGauge(prefix + nodejsEventLoopLagMax, {
			description: "The maximum recorded event loop delay.",
		})
		.addCallback((observable) => {
			observable.observe(eventLoopDelayMonitor.max / 1e9, labels);
		});

	nodeMetrics
		.createObservableGauge(prefix + nodejsEventLoopLagMean, {
			description: "The mean of the recorded event loop delays.",
		})
		.addCallback((observable) => {
			observable.observe(eventLoopDelayMonitor.mean / 1e9, labels);
		});

	nodeMetrics
		.createObservableGauge(prefix + nodejsEventLoopLagStddev, {
			description: "The standard deviation of the recorded event loop delays.",
		})
		.addCallback((observable) => {
			observable.observe(eventLoopDelayMonitor.stddev / 1e9, labels);
		});

	nodeMetrics
		.createObservableGauge(prefix + nodejsEventLoopLagP50, {
			description: "The 50th percentile of the recorded event loop delays.",
		})
		.addCallback((observable) => {
			observable.observe(eventLoopDelayMonitor.percentile(50) / 1e9, labels);
		});

	nodeMetrics
		.createObservableGauge(prefix + nodejsEventLoopLagP90, {
			description: "The 90th percentile of the recorded event loop delays.",
		})
		.addCallback((observable) => {
			observable.observe(eventLoopDelayMonitor.percentile(90) / 1e9, labels);
		});

	nodeMetrics
		.createObservableGauge(prefix + nodejsEventLoopLagP99, {
			description: "The 99th percentile of the recorded event loop delays.",
		})
		.addCallback((observable) => {
			observable.observe(eventLoopDelayMonitor.percentile(99) / 1e9, labels);
		});
}
