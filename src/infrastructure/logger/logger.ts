import type { Logger as PinoLogger } from "pino";
import { pino, stdSerializers, stdTimeFunctions } from "pino";
import { type PackageJson, packageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";

export type Logger = PinoLogger;
export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export function createMockLogger(): Logger {
	return createLogger("mock-logger", {
		config: { logLevel: "error" },
		packageJson: { name: `${packageJson.name}-mock-test` },
	});
}

export function createLogger(
	serviceName: string,
	{
		config,
		packageJson,
	}: {
		config: Pick<Config, "logLevel">;
		packageJson: Pick<PackageJson, "name">;
	},
): Logger {
	const logger = pino({
		name: packageJson.name,
		level: config.logLevel,
		redact: [
			"[*].password",
			"password",
			"[*].token",
			"token",
			"[*].key",
			"key",
		],
		serializers: {
			error: stdSerializers.errWithCause,
			err: stdSerializers.errWithCause,
			cause: stdSerializers.errWithCause,
		},
		formatters: {
			// format level as string instead of number
			level(label) {
				return { level: label };
			},
		},
		timestamp: stdTimeFunctions.isoTime,
	});

	return logger.child({
		serviceName,
	});
}
