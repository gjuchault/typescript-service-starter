import fs from "node:fs/promises";
import process from "node:process";
import type { Meter } from "@opentelemetry/api";
import type { MonitorOptions } from "./index.ts";
const PROCESS_OPEN_FDS = "process_open_fds";

export function monitorProcessOpenFileDescriptors(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
): void {
	if (process.platform !== "linux") {
		return;
	}

	meter
		.createObservableGauge(prefix + PROCESS_OPEN_FDS, {
			description: "Number of open file descriptors.",
		})
		.addCallback(async (observable) => {
			try {
				const fds = await fs.readdir("/proc/self/fd");
				// Minus 1 to not count the fd that was used by readdirSync(),
				// it's now closed.
				observable.observe(fds.length - 1, labels);
			} catch {
				// noop
			}
		});
}
