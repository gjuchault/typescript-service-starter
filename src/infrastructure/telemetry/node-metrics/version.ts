import process from "node:process";
import type { Meter } from "@opentelemetry/api";
import type { MonitorOptions } from "./index.ts";

export function monitorVersion(
	meter: Meter,
	{ prefix, labels }: MonitorOptions,
): void {
	const nodeVersionInfo = "nodejs_version_info";
	const versionSegments = process.version.slice(1).split(".").map(Number);

	const version = {
		...labels,
		version: process.version,
		major: versionSegments[0],
		minor: versionSegments[1],
		patch: versionSegments[2],
	};

	meter
		.createUpDownCounter(prefix + nodeVersionInfo, {
			description: "Node.js version info.",
		})
		.add(1, version);
}
