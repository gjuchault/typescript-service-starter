import { z } from "zod";

import { version } from "../package.json";
import type { Entries } from "./type-helpers/entries";
import { rejectUnexpectedValue } from "./type-helpers/switchGuard";

export type Config = typeof config;

export const config = {
  name: "app",
  version,
  env: z
    .union([
      z.literal("development"),
      z.literal("production"),
      z.literal("test"),
    ])
    .parse(process.env.NODE_ENV),
  logLevel: z
    .union([
      z.literal("fatal"),
      z.literal("error"),
      z.literal("warn"),
      z.literal("info"),
      z.literal("debug"),
      z.literal("trace"),
    ])
    .parse(process.env.LOG_LEVEL),
  address: z.string().parse(process.env.ADDRESS),
  /**
   * Used for cookie signing
   */
  secret: z.string().uuid().parse(process.env.SECRET),

  port: z
    .string()
    .refine((portAsString) => {
      const port = Number(portAsString);

      return port > 0 && port < 65536;
    })
    .transform((portAsString) => Number(portAsString))
    .parse(process.env.PORT),

  databaseUrl: z.string().parse(process.env.DATABASE_URL),

  redisUrl: z.string().parse(process.env.REDIS_URL),
};

export function mergeConfig(configOverride: Partial<Config>) {
  const configEntries = Object.entries(configOverride) as Entries<Config>;
  for (const [configKey, configValueOverride] of configEntries) {
    switch (configKey) {
      case "address":
        config.address = configValueOverride;
        break;
      case "databaseUrl":
        config.databaseUrl = configValueOverride;
        break;
      case "env":
        config.env = configValueOverride;
        break;
      case "logLevel":
        config.logLevel = configValueOverride;
        break;
      case "name":
        config.name = configValueOverride;
        break;
      case "port":
        config.port = configValueOverride;
        break;
      case "redisUrl":
        config.redisUrl = configValueOverride;
        break;
      case "secret":
        config.secret = configValueOverride;
        break;
      case "version":
        config.version = configValueOverride;
        break;
      default:
        rejectUnexpectedValue(configKey);
    }
  }
}
