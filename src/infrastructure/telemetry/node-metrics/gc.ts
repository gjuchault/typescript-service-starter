import {
	constants,
	type PerformanceNodeEntry,
	PerformanceObserver,
} from "node:perf_hooks";
import type { Meter } from "@opentelemetry/api";
import type { MonitorOptions } from "./index.ts";

export function monitorGc(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
): void {
	const nodejsGcDurationSeconds = "nodejs_gc_duration_seconds";

	const histogram = meter.createHistogram(prefix + nodejsGcDurationSeconds, {
		description:
			"Garbage collection duration by kind, one of major, minor, incremental or weakcb.",
	});

	const kinds: Record<number, Record<string, string>> = {};
	kinds[constants.NODE_PERFORMANCE_GC_MAJOR] = { ...labels, kind: "major" };
	kinds[constants.NODE_PERFORMANCE_GC_MINOR] = { ...labels, kind: "minor" };
	kinds[constants.NODE_PERFORMANCE_GC_INCREMENTAL] = {
		...labels,
		kind: "incremental",
	};
	kinds[constants.NODE_PERFORMANCE_GC_WEAKCB] = { ...labels, kind: "weakcb" };

	const obs = new PerformanceObserver((list) => {
		const performanceEntry = list.getEntries().at(0);

		if (performanceEntry === undefined || performanceEntry.entryType !== "gc") {
			return;
		}

		const performanceNodeEntry = performanceEntry as PerformanceNodeEntry;

		// Convert duration from milliseconds to seconds
		histogram.record(
			performanceNodeEntry.duration / 1000,
			kinds[performanceNodeEntry.detail.kind],
		);
	});

	// We do not expect too many gc events per second, so we do not use buffering
	obs.observe({ entryTypes: ["gc"], buffered: false });
}
