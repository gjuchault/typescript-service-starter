export function safeMemoryUsage(): NodeJS.MemoryUsage | undefined {
	try {
		return process.memoryUsage();
	} catch {
		// process.memoryUsage() can throw on some platforms, see https://github.com/siimon/prom-client/issues/67

		return undefined;
	}
}
