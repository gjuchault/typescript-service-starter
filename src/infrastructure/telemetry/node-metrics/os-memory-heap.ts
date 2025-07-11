import { platform } from "node:process";
import type { Meter } from "@opentelemetry/api";
import { safeMemoryUsage } from "./helpers/safe-memory-usage.ts";
import type { MonitorOptions } from "./index.ts";
import { monitorOsMemoryHeapLinux } from "./os-memory-heap-linux.ts";

const PROCESS_RESIDENT_MEMORY = "process_resident_memory_bytes";

function monitorOsMemoryHeapNotLinux(
	meter: Meter,
	{ prefix, labels }: Pick<MonitorOptions, "prefix" | "labels">,
) {
	meter
		.createObservableGauge(prefix + PROCESS_RESIDENT_MEMORY, {
			description: "Resident memory size in bytes.",
		})
		.addCallback((observable) => {
			const memUsage = safeMemoryUsage();
			// I don't think the other things returned from
			// `process.memoryUsage()` is relevant to a standard export
			if (memUsage) {
				observable.observe(memUsage.rss, labels);
			}
		});
}

export function monitorOsMemoryHeap(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
) {
	if (platform === "linux") {
		monitorOsMemoryHeapLinux(meter, { prefix, labels });
	} else {
		monitorOsMemoryHeapNotLinux(meter, { prefix, labels });
	}
}
