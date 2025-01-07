import fs from "node:fs/promises";
import type { Meter } from "@opentelemetry/api";
import type { MonitorOptions } from "./index.ts";

let maxFds: number | undefined;

const multipleSpacesRegex = / {2,}/;

export async function monitorProcessMaxFileDescriptors(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
) {
	const processMaxFds = "process_max_fds";

	if (maxFds === undefined) {
		// This will fail if a linux-like procfs is not available.
		try {
			const limits = await fs.readFile("/proc/self/limits", "utf8");
			const lines = limits.split("\n");
			for (const line of lines) {
				if (line.startsWith("Max open files")) {
					const parts = line.split(multipleSpacesRegex);
					maxFds = Number(parts[1]);
					break;
				}
			}
		} catch {
			return;
		}
	}

	if (maxFds === undefined) {
		return;
	}

	meter
		.createUpDownCounter(prefix + processMaxFds, {
			description: "Maximum number of open file descriptors.",
		})
		.add(maxFds, labels);
}
