import { setTimeout } from "node:timers/promises";

export function promiseWithTimeout<T>(
	timeoutMs: number,
	promise: () => Promise<T>,
): Promise<T> {
	const ac = new AbortController();
	const signal = ac.signal;

	async function timeoutPromise(): Promise<never> {
		await setTimeout(timeoutMs, undefined, {
			signal,
		});

		throw new Error("Promise timed out");
	}

	return Promise.race([promise(), timeoutPromise()]).then((result) => {
		ac.abort();

		return result;
	});
}
