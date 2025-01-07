import v8 from "node:v8";
import type { Meter } from "@opentelemetry/api";
import type { MonitorOptions } from "./index.ts";

const nodeJsHeapSize = {
	total: "nodejs_heap_space_size_total_bytes",
	used: "nodejs_heap_space_size_used_bytes",
	available: "nodejs_heap_space_size_available_bytes",
};

const spaceRegex = /_space$/;

export function monitorHeapSpacesSizeAndUsed(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
): void {
	const labelsBySpace: Record<
		string,
		Record<"total" | "used" | "available", Record<string, string>>
	> = {};

	let stats:
		| {
				total: { value: number; labels: Record<string, string> };
				used: { value: number; labels: Record<string, string> };
				available: { value: number; labels: Record<string, string> };
		  }[]
		| undefined;
	function getStats() {
		if (stats !== undefined) {
			return stats;
		}

		stats = v8.getHeapSpaceStatistics().map((space) => {
			const spaceLabels =
				labelsBySpace[space.space_name] ?? defaultLabelsBySpace(space, labels);
			labelsBySpace[space.space_name] = spaceLabels;

			return {
				total: { value: space.space_size, labels: spaceLabels.total },
				used: { value: space.space_used_size, labels: spaceLabels.used },
				available: {
					value: space.space_available_size,
					labels: spaceLabels.available,
				},
			};
		});

		setTimeout(() => {
			stats = undefined;
		}, 1000).unref();
		return stats;
	}

	meter
		.createObservableGauge(prefix + nodeJsHeapSize.total, {
			description: "Process heap space size total from Node.js in bytes.",
		})
		.addCallback((observable) => {
			getStats();

			for (const stat of stats ?? []) {
				observable.observe(stat.total.value, stat.total.labels);
			}
		});

	meter
		.createObservableGauge(prefix + nodeJsHeapSize.used, {
			description: "Process heap space size used from Node.js in bytes.",
		})
		.addCallback((observable) => {
			getStats();

			for (const stat of stats ?? []) {
				observable.observe(stat.used.value, stat.used.labels);
			}
		});

	meter
		.createObservableGauge(prefix + nodeJsHeapSize.available, {
			description: "Process heap space size available from Node.js in bytes.",
		})
		.addCallback((observable) => {
			getStats();

			for (const stat of stats ?? []) {
				observable.observe(stat.available.value, stat.available.labels);
			}
		});
}

function defaultLabelsBySpace(
	space: v8.HeapSpaceInfo,
	labels: Record<string, string>,
): Record<"total" | "used" | "available", Record<string, string>> {
	const spaceName = space.space_name.replace(spaceRegex, "");

	return {
		total: { ...labels, space: spaceName },
		used: { ...labels, space: spaceName },
		available: { ...labels, space: spaceName },
	};
}
