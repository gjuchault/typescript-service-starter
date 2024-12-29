import type { Logger as PinoLogger } from "pino";
import { pino } from "pino";
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
		formatters: {
			// format level as string instead of number
			level(label) {
				return { level: label };
			},
		},
		timestamp: pino.stdTimeFunctions.isoTime,
		hooks: {
			// reverse pino method so it goes logger.method(message, details) instead
			// of logger.method(details, message)
			logMethod(inputArguments: unknown[], method) {
				if (inputArguments.length >= 2) {
					const argument1 = inputArguments[0];
					const argument2 = inputArguments[1];
					Reflect.apply(method, this, [
						argument2,
						argument1,
						...inputArguments.slice(2),
					]);

					return;
				}

				method.apply(this, inputArguments as [string, ...unknown[]]);
			},
		},
	});

	return logger.child({
		serviceName,
	});
}
