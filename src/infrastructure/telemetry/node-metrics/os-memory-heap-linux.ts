import fs from "node:fs/promises";
import type { Meter } from "@opentelemetry/api";
import type { MonitorOptions } from "./index.ts";

const values = ["VmSize", "VmRSS", "VmData"];

const PROCESS_RESIDENT_MEMORY = "process_resident_memory_bytes";
const PROCESS_VIRTUAL_MEMORY = "process_virtual_memory_bytes";
const PROCESS_HEAP = "process_heap_bytes";

function structureOutput(input: string): Record<string, number> {
	return Object.fromEntries(
		input
			.split("\n")
			.filter((s) => values.some((value) => s.indexOf(value) === 0))
			.map((string) => {
				const split = string.split(":");

				// Get the value
				let value = split.at(1)?.trim() ?? "";
				// Remove trailing ` kb`
				value = value.slice(0, value.length - 3);

				// Make it into a number in bytes bytes
				return [split.at(0) ?? "", Number(value) * 1024];
			}),
	);
}

export function monitorOsMemoryHeapLinux(
	meter: Meter,
	{ prefix, labels }: Pick<MonitorOptions, "prefix" | "labels">,
) {
	let stats: Record<string, number> | undefined;
	async function getStats() {
		if (stats !== undefined) {
			return stats;
		}

		try {
			const stat = await fs.readFile("/proc/self/status", "utf8");
			stats = structureOutput(stat);
		} catch {
			stats = undefined;
		}

		setTimeout(() => {
			stats = undefined;
		}, 1000).unref();
		return stats;
	}

	meter
		.createObservableGauge(prefix + PROCESS_RESIDENT_MEMORY, {
			description: "Resident memory size in bytes.",
		})
		.addCallback(async (observable) => {
			await getStats();

			const vmRss = getStat(stats, "VmRSS");
			if (vmRss !== undefined) {
				observable.observe(vmRss, labels);
			}
		});

	meter
		.createObservableGauge(prefix + PROCESS_VIRTUAL_MEMORY, {
			description: "Virtual memory size in bytes.",
		})
		.addCallback(async (observable) => {
			await getStats();

			const vmSize = getStat(stats, "VmSize");
			if (vmSize !== undefined) {
				observable.observe(vmSize, labels);
			}
		});

	meter
		.createObservableGauge(prefix + PROCESS_HEAP, {
			description: "Process heap size in bytes.",
		})
		.addCallback(async (observable) => {
			await getStats();

			const vmData = getStat(stats, "VmData");
			if (vmData !== undefined) {
				observable.observe(vmData, labels);
			}
		});
}

function getStat<Key extends string>(
	stats: Record<string, number> | undefined,
	key: Key,
): number | undefined {
	if (
		stats !== undefined &&
		key in stats &&
		(stats as Record<Key, number | undefined>)[key] !== undefined
	) {
		return stats[key];
	}

	return undefined;
}
