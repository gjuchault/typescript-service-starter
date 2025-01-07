import { metrics } from "@opentelemetry/api";
import { monitorEventLoopLag } from "./event-loop-lag.ts";
import { monitorGc } from "./gc.ts";
import { monitorHeapSizeAndUsed } from "./heap-size-and-used.ts";
import { monitorHeapSpacesSizeAndUsed } from "./heap-spaces-size-and-used.ts";
import { monitorOsMemoryHeap } from "./os-memory-heap.ts";
import { monitorProcessCpuTotal } from "./process-cpu-total.ts";
import { monitorProcessHandles } from "./process-handles.ts";
import { monitorProcessMaxFileDescriptors } from "./process-max-file-descriptors.ts";
import { monitorProcessOpenFileDescriptors } from "./process-open-file-descriptors.ts";
import { monitorProcessRequests } from "./process-requests.ts";
import { monitorProcessStartTime } from "./process-start-time.ts";
import { monitorVersion } from "./version.ts";

export interface MonitorOptions {
	prefix: string;
	labels: Record<string, string>;
	eventLoopMonitoringPrecision: number;
}

export async function createNodeMetrics(
	options: MonitorOptions = {
		prefix: "",
		labels: {},
		eventLoopMonitoringPrecision: 10,
	},
) {
	const nodeMetrics = metrics.getMeter("nodejs", process.version);

	monitorEventLoopLag(nodeMetrics, options);
	monitorGc(nodeMetrics, options);
	monitorHeapSizeAndUsed(nodeMetrics, options);
	monitorHeapSpacesSizeAndUsed(nodeMetrics, options);
	monitorOsMemoryHeap(nodeMetrics, options);
	monitorProcessCpuTotal(nodeMetrics, options);
	monitorProcessHandles(nodeMetrics, options);
	monitorProcessRequests(nodeMetrics, options);
	await monitorProcessMaxFileDescriptors(nodeMetrics, options);
	monitorProcessOpenFileDescriptors(nodeMetrics, options);
	monitorProcessStartTime(nodeMetrics, options);
	monitorVersion(nodeMetrics, options);

	return nodeMetrics;
}
