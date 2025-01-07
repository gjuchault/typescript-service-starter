import type { Meter } from "@opentelemetry/api";
import { reduceCount } from "./helpers/aggregator-by-object-name.ts";
import { getActiveRequests } from "./helpers/process-methods.ts";
import type { MonitorOptions } from "./index.ts";

export function monitorProcessRequests(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
): void {
	const nodejsActiveRequests = "nodejs_active_requests";
	const nodejsActiveRequestsTotal = "nodejs_active_requests_total";

	meter
		.createObservableGauge(prefix + nodejsActiveRequests, {
			description:
				"Number of active libuv requests grouped by request type. Every request type is C++ class name.", // eslint-disable-line max-len
		})
		.addCallback((observable) => {
			for (const [key, value] of reduceCount(getActiveRequests())) {
				observable.observe(value, { ...labels, type: key });
			}
		});

	meter
		.createObservableGauge(prefix + nodejsActiveRequestsTotal, {
			description: "Total number of active requests.",
		})
		.addCallback((observable) => {
			observable.observe(getActiveRequests().length, labels);
		});
}
