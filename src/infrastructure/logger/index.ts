import pino, { Logger } from "pino";
import { pinoMixin } from "../telemetry/instrumentations/pino";
import * as config from "../../config";

export { Logger };

export const logger = pino({
  name: "app",
  level: config.logLevel,
  formatters: {
    // format level as string instead of number
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  hooks: {
    logMethod(inputArgs, method) {
      if (inputArgs.length >= 2) {
        const arg1 = inputArgs.shift();
        const arg2 = inputArgs.shift();
        return method.apply(this, [arg2, arg1, ...inputArgs]);
      }

      return method.apply(this, inputArgs as [string, ...any[]]);
    },
  },
  mixin: pinoMixin,
});

export function createLogger(serviceName: string): Logger {
  return logger.child({
    serviceName,
  });
}
