import type { GlideClient } from "@valkey/valkey-glide";
import type { RouteOptions } from "fastify";

export class RateLimitValkeyStore {
	static client: GlideClient;
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
		[key: string]: any;
	}) {
		this.continueExceeding = globalParams.continueExceeding ?? false;
		this.exponentialBackoff = globalParams.exponentialBackoff ?? false;
		this.key = globalParams.nameSpace ?? "fastify-rate-limit-";
		this.timeWindow = globalParams.timeWindow ?? 60000;
		this.max = globalParams.max ?? 100;
	}

	static setClient(client: GlideClient) {
		RateLimitValkeyStore.client = client;
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
				const current = await RateLimitValkeyStore.client.incr(fullKey);

				let ttl: number;

				if (current === 1 || (this.continueExceeding && current > this.max)) {
					// Set expiration for new key or when continuing to exceed
					await RateLimitValkeyStore.client.pexpire(fullKey, this.timeWindow);
					ttl = this.timeWindow;
				} else if (this.exponentialBackoff && current > this.max) {
					// Apply exponential backoff
					const backoffExponent = current - this.max - 1;
					const maxSafeInteger = 2 ** 53 - 1;
					const backoffTime = Math.min(
						this.timeWindow * 2 ** backoffExponent,
						maxSafeInteger,
					);
					await RateLimitValkeyStore.client.pexpire(fullKey, backoffTime);
					ttl = backoffTime;
				} else {
					// Get remaining TTL
					const remainingTtl = await RateLimitValkeyStore.client.pttl(fullKey);
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
