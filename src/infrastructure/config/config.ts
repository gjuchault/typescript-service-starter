import process from "node:process";
import ms from "ms";
import { z } from "zod";

const env = z
	.object({
		// biome-ignore lint/style/useNamingConvention: env variable
		LOG_LEVEL: z.string(),
		// biome-ignore lint/style/useNamingConvention: env variable
		HTTP_ADDRESS: z.string(),
		// biome-ignore lint/style/useNamingConvention: env variable
		PORT: z.string().optional(),
		// biome-ignore lint/style/useNamingConvention: env variable
		HTTP_PORT: z.string().optional(),
		// biome-ignore lint/style/useNamingConvention: env variable
		HTTP_REQUEST_TIMEOUT: z.string(),
		// biome-ignore lint/style/useNamingConvention: env variable
		HTTP_COOKIE_SIGNING_SECRET: z.string(),
		// biome-ignore lint/style/useNamingConvention: env variable
		DATABASE_URL: z.string(),
		// biome-ignore lint/style/useNamingConvention: env variable
		DATABASE_MAXIMUM_POOL_SIZE: z.string(),
		// biome-ignore lint/style/useNamingConvention: env variable
		DATABASE_IDLE_TIMEOUT: z.string(),
		// biome-ignore lint/style/useNamingConvention: env variable
		DATABASE_STATEMENT_TIMEOUT: z.string(),
		// biome-ignore lint/style/useNamingConvention: env variable
		REDIS_URL: z.string().optional(),
		// biome-ignore lint/style/useNamingConvention: env variable
		TRACING_SAMPLING: z.string(),
		// biome-ignore lint/style/useNamingConvention: env variable
		OTLP_TRACE_ENDPOINT: z.string().optional(),
		// biome-ignore lint/style/useNamingConvention: env variable
		OTLP_METRICS_ENDPOINT: z.string().optional(),
	})
	.parse(process.env);

export type Config = {
	logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
	httpAddress: string;
	httpPort: number;
	httpRequestTimeout: number;
	httpCookieSigningSecret: string;
	databaseUrl: string;
	databaseMaximumPoolSize: number;
	databaseIdleTimeout: number;
	databaseStatementTimeout: number;
	redisUrl: string | undefined;
	tracingSampling: number;
	otlpTraceEndpoint: string | undefined;
	otlpMetricsEndpoint: string | undefined;
};

function transformMs(input: string): number {
	// safe cast here as passing a non-StringValue will result in undefined
	const value = ms(input as ms.StringValue);

	if (value === undefined) {
		throw new Error(`Invalid duration: ${input}`);
	}

	return value;
}

export const config: Config = {
	logLevel: z
		.union([
			z.literal("fatal"),
			z.literal("error"),
			z.literal("warn"),
			z.literal("info"),
			z.literal("debug"),
			z.literal("trace"),
		])
		.parse(env.LOG_LEVEL),

	httpAddress: z.string().parse(env.HTTP_ADDRESS),
	httpPort: z.coerce
		.number()
		.int()
		.min(10)
		.max(65_536)
		.parse(env.PORT ?? env.HTTP_PORT),
	httpRequestTimeout: z
		.string()
		.transform(transformMs)
		.parse(env.HTTP_REQUEST_TIMEOUT),
	httpCookieSigningSecret: z
		.string()
		.regex(/^[0-9a-f]{64}$/)
		.parse(env.HTTP_COOKIE_SIGNING_SECRET),

	databaseUrl: z.string().parse(env.DATABASE_URL),

	databaseMaximumPoolSize: z.coerce
		.number()
		.int()
		.min(0)
		.max(5000)
		.parse(env.DATABASE_MAXIMUM_POOL_SIZE),

	databaseIdleTimeout: z
		.string()
		.transform(transformMs)
		.parse(env.DATABASE_IDLE_TIMEOUT),

	databaseStatementTimeout: z
		.string()
		.transform(transformMs)
		.parse(env.DATABASE_STATEMENT_TIMEOUT),

	redisUrl: z.string().url().optional().parse(env.REDIS_URL),

	tracingSampling: z.coerce
		.number()
		.finite()
		.min(0)
		.max(1)
		.parse(env.TRACING_SAMPLING),

	otlpTraceEndpoint: z.string().url().optional().parse(env.OTLP_TRACE_ENDPOINT),
	otlpMetricsEndpoint: z
		.string()
		.url()
		.optional()
		.parse(env.OTLP_METRICS_ENDPOINT),
};
