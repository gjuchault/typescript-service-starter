import type { Meter } from "@opentelemetry/api";
import { safeMemoryUsage } from "./helpers/safe-memory-usage.ts";
import type { MonitorOptions } from "./index.ts";

export function monitorHeapSizeAndUsed(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
): void {
	const nodejsHeapSizeTotal = "nodejs_heap_size_total_bytes";
	const nodejsHeapSizeUsed = "nodejs_heap_size_used_bytes";
	const nodejsExternalMemory = "nodejs_external_memory_bytes";

	let stats: NodeJS.MemoryUsage | undefined;
	function getStats() {
		if (stats !== undefined) {
			return stats;
		}

		stats = safeMemoryUsage() ?? undefined;

		setTimeout(() => {
			stats = undefined;
		}, 1000).unref();

		return stats;
	}

	meter
		.createObservableGauge(prefix + nodejsHeapSizeTotal, {
			description: "Process heap size from Node.js in bytes.",
		})
		.addCallback((observable) => {
			getStats();

			if (stats?.heapTotal !== undefined) {
				observable.observe(stats.heapTotal, labels);
			}
		});

	meter
		.createObservableGauge(prefix + nodejsHeapSizeUsed, {
			description: "Process heap size used from Node.js in bytes.",
		})
		.addCallback((observable) => {
			getStats();

			if (stats?.heapTotal !== undefined) {
				observable.observe(stats.heapUsed, labels);
			}
		});

	meter
		.createObservableGauge(prefix + nodejsExternalMemory, {
			description: "Node.js external memory size in bytes.",
		})
		.addCallback((observable) => {
			getStats();

			if (stats?.external !== undefined) {
				observable.observe(stats.external, labels);
			}
		});
}
