import { setTimeout } from "node:timers/promises";

export function promiseWithTimeout<T>(
	timeoutMs: number,
	promise: () => Promise<T>,
): Promise<T> {
	async function timeoutPromise(): Promise<never> {
		await setTimeout(timeoutMs);
		throw new Error("Promise timed out");
	}

	return Promise.race([promise(), timeoutPromise()]).then((result) => {
		return result;
	});
}
