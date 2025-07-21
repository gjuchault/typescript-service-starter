import type { RouteOptions } from "fastify";
import { flow } from "ts-flowgen";
import type { Cache, ValkeyError } from "../cache/cache.ts";

export class RateLimitValkeyStore {
	static client: Pick<Cache, "incr" | "pexpire" | "pttl">;
	private continueExceeding: boolean;
	private exponentialBackoff: boolean;
	private key: string;
	private timeWindow: number;
	private max: number;

	constructor(globalParams: {
		continueExceeding?: boolean;
		exponentialBackoff?: boolean;
		nameSpace?: string;
		timeWindow?: number;
		max?: number;
		// biome-ignore lint/suspicious/noExplicitAny: fastify
		[key: string]: any;
	}) {
		this.continueExceeding = globalParams.continueExceeding ?? false;
		this.exponentialBackoff = globalParams.exponentialBackoff ?? false;
		this.key = globalParams.nameSpace ?? "fastify-rate-limit-";
		this.timeWindow = globalParams.timeWindow ?? 60000;
		this.max = globalParams.max ?? 100;
	}

	static setClient(client: Pick<Cache, "incr" | "pexpire" | "pttl">) {
		RateLimitValkeyStore.client = client;
	}

	static async cacheMethod<Value>(
		method: AsyncGenerator<ValkeyError, Value>,
		callback: (error: Error | null, result?: never) => void,
	): Promise<Value | undefined> {
		const currentResult = await flow(async function* () {
			return yield* method;
		});

		if (currentResult.ok === false) {
			callback(
				currentResult.error.error instanceof Error
					? currentResult.error.error
					: new Error("Unknown error", {
							cause: currentResult.error.error,
						}),
			);

			return;
		}

		return currentResult.value;
	}

	incr(
		key: string,
		callback: (
			error: Error | null,
			result?: { current: number; ttl: number },
		) => void,
	): void {
		(async () => {
			try {
				const fullKey = this.key + key;
				const current = await RateLimitValkeyStore.cacheMethod(
					RateLimitValkeyStore.client.incr(fullKey),
					callback,
				);

				if (current === undefined) {
					return;
				}

				let ttl: number;

				if (current === 1 || (this.continueExceeding && current > this.max)) {
					// Set expiration for new key or when continuing to exceed
					await RateLimitValkeyStore.cacheMethod(
						RateLimitValkeyStore.client.pexpire(fullKey, this.timeWindow),
						callback,
					);
					ttl = this.timeWindow;
				} else if (this.exponentialBackoff && current > this.max) {
					// Apply exponential backoff
					const backoffExponent = current - this.max - 1;
					const maxSafeInteger = 2 ** 53 - 1;
					const backoffTime = Math.min(
						this.timeWindow * 2 ** backoffExponent,
						maxSafeInteger,
					);
					await RateLimitValkeyStore.cacheMethod(
						RateLimitValkeyStore.client.pexpire(fullKey, backoffTime),
						callback,
					);
					ttl = backoffTime;
				} else {
					// Get remaining TTL
					const remainingTtl = await RateLimitValkeyStore.cacheMethod(
						RateLimitValkeyStore.client.pttl(fullKey),
						callback,
					);

					if (remainingTtl === undefined) {
						return;
					}

					ttl = remainingTtl > 0 ? remainingTtl : this.timeWindow;
				}

				callback(null, { current, ttl });
			} catch (error) {
				callback(
					error instanceof Error
						? error
						: new Error("Unknown error", { cause: error }),
				);
			}
		})();
	}

	child(
		routeOptions: RouteOptions & { path: string; prefix: string },
	): RateLimitValkeyStore {
		return new RateLimitValkeyStore({
			continueExceeding: this.continueExceeding,
			exponentialBackoff: this.exponentialBackoff,
			timeWindow: this.timeWindow,
			max: this.max,
			nameSpace: `${this.key}${routeOptions.prefix}${routeOptions.path}-`,
		});
	}
}
