import { uptime } from "node:process";
import type { Meter } from "@opentelemetry/api";
import type { MonitorOptions } from "./index.ts";

const startInSeconds = Math.round(Date.now() / 1000 - uptime());
const PROCESS_START_TIME = "process_start_time_seconds";

export function monitorProcessStartTime(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
): void {
	meter
		.createUpDownCounter(prefix + PROCESS_START_TIME, {
			description: "Start time of the process since unix epoch in seconds.",
		})
		.add(startInSeconds, labels);
}
