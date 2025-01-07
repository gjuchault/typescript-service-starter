import type { Meter } from "@opentelemetry/api";
import { reduceCount } from "./helpers/aggregator-by-object-name.ts";
import { getActiveHandles } from "./helpers/process-methods.ts";
import type { MonitorOptions } from "./index.ts";

export function monitorProcessHandles(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
) {
	const nodejsActiveHandles = "nodejs_active_handles";
	const nodejsActiveHandlesTotal = "nodejs_active_handles_total";

	meter
		.createObservableGauge(prefix + nodejsActiveHandles, {
			description:
				"Number of active libuv handles grouped by handle type. Every handle type is C++ class name.", // eslint-disable-line max-len
		})
		.addCallback((observable) => {
			for (const [key, value] of reduceCount(getActiveHandles())) {
				observable.observe(value, { ...labels, type: key });
			}
		});

	meter
		.createObservableGauge(prefix + nodejsActiveHandlesTotal, {
			description: "Total number of active handles.",
		})
		.addCallback((observable) => {
			const handles = getActiveHandles();
			observable.observe(handles.length, labels);
		});
}
