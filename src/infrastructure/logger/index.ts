import { pino, Logger } from "pino";
import { getConfig } from "../../config";
import { pinoMixin as telemetryMixin } from "../telemetry/instrumentations/pino";

export { Logger };

export function createLogger(serviceName: string): Logger {
  const { logLevel } = getConfig();

  const logger = pino({
    name: "app",
    level: logLevel,
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
      logMethod(inputArgs, method) {
        if (inputArgs.length >= 2) {
          const arg1 = inputArgs.shift();
          const arg2 = inputArgs.shift();
          return method.apply(this, [arg2, arg1, ...inputArgs]);
        }

        return method.apply(this, inputArgs as [string, ...unknown[]]);
      },
    },
    mixin: telemetryMixin,
  });

  return logger.child({
    serviceName,
  });
}
