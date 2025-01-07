import type { Meter } from "@opentelemetry/api";
import type { MonitorOptions } from "./index.ts";

export function monitorProcessCpuTotal(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
): void {
	const processCpuUserSeconds = "process_cpu_user_seconds_total";
	const processCpuSystemSeconds = "process_cpu_system_seconds_total";
	const processCpuSeconds = "process_cpu_seconds_total";

	let lastCpuUsage = process.cpuUsage();

	const cpuUserUsageCounter = meter.createCounter(
		prefix + processCpuUserSeconds,
		{ description: "Total user CPU time spent in seconds." },
	);

	const cpuSystemUsageCounter = meter.createCounter(
		prefix + processCpuSystemSeconds,
		{ description: "Total system CPU time spent in seconds." },
	);

	meter
		.createObservableCounter(prefix + processCpuSeconds, {
			description: "Total user and system CPU time spent in seconds.",
		})
		.addCallback((observable) => {
			const cpuUsage = process.cpuUsage();
			const userUsageSecs = (cpuUsage.user - lastCpuUsage.user) / 1e6;
			const systemUsageSecs = (cpuUsage.system - lastCpuUsage.system) / 1e6;
			lastCpuUsage = cpuUsage;

			cpuUserUsageCounter.add(userUsageSecs, labels);
			cpuSystemUsageCounter.add(systemUsageSecs, labels);
			observable.observe((cpuUsage.user + cpuUsage.system) / 1e6, labels);
		});

	cpuUserUsageCounter.add(lastCpuUsage.user / 1e6, labels);
	cpuSystemUsageCounter.add(lastCpuUsage.system / 1e6, labels);
}
