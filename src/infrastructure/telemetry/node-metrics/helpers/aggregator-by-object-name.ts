import type { ObservableResult } from "@opentelemetry/api";

export function createAggregatorByObjectName() {
	const all = new Map();

	return function aggregateByObjectName(
		metric: ObservableResult,
		labels: Record<string, string>,
		list: unknown[],
	) {
		const current = new Map<string, number>();

		for (const key of all.keys()) {
			current.set(key, 0);
		}

		for (const stream of list) {
			const listElementConstructor = stream?.constructor;
			if (typeof listElementConstructor === "undefined") {
				continue;
			}

			current.set(
				listElementConstructor.name,
				(current.get(listElementConstructor.name) || 0) + 1,
			);
		}

		for (const [key, value] of current) {
			const metricLabels = all.get(key) || { ...labels, type: key };
			metric.observe(value, metricLabels);
			all.set(key, metricLabels);
		}
	};
}

export function reduceCount(input: string[]): Map<string, number> {
	const result = new Map<string, number>();

	for (const item of input) {
		result.set(item, (result.get(item) || 0) + 1);
	}

	return result;
}
