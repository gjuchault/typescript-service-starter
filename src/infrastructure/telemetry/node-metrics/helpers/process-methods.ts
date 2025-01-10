import { getActiveResourcesInfo } from "node:process";

export function getActiveHandles(): string[] {
	return getActiveResourcesInfo();
}

const requestsResourcesNames = new Set([
	"tlswrap",
	"tcpwrap",
	"tcpsocketwrap",
	"tcpserverwrap",
	"getaddrinforeqwrap",
	"fsreqcallback",
]);

export function getActiveRequests(): string[] {
	return getActiveResourcesInfo().filter((resource) =>
		requestsResourcesNames.has(resource.toLowerCase()),
	);
}
