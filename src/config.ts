import ms from "ms";
import "dotenv/config";
import { z } from "zod";

import { version, description } from "../package.json";

export interface Config {
  name: string;
  version: string;
  description: string;
  env: "development" | "production" | "test";
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  address: string;
  secret: string;
  port: number;
  databaseUrl: string;
  databaseMaximumPoolSize: number;
  databaseIdleTimeout: number;
  databaseStatementTimeout: number;
  redisUrl: string;
}

const config: Config = {
  name: "app",
  version,
  description,
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
    .refine((databaseMaximumPoolSize) =>
      refineMinMaxInteger(databaseMaximumPoolSize, { min: 10, max: 65_536 })
    )
    .transform(Number)
    .parse(process.env.PORT),

  databaseUrl: z.string().parse(process.env.DATABASE_URL),

  databaseMaximumPoolSize: z
    .string()
    .refine((databaseMaximumPoolSize) =>
      refineMinMaxInteger(databaseMaximumPoolSize, { min: 0, max: 5000 })
    )
    .transform(Number)
    .parse(process.env.DATABASE_MAXIMUM_POOL_SIZE),

  databaseIdleTimeout: z
    .string()
    .min(1)
    .refine((databaseIdleTimeout) => refineMs(databaseIdleTimeout))
    .transform((databaseIdleTimeout) => ms(databaseIdleTimeout))
    .parse(process.env.DATABASE_IDLE_TIMEOUT),

  databaseStatementTimeout: z
    .string()
    .min(1)
    .refine((databaseStatementTimeout) => refineMs(databaseStatementTimeout))
    .transform((databaseStatementTimeout) => ms(databaseStatementTimeout))
    .parse(process.env.DATABASE_STATEMENT_TIMEOUT),

  redisUrl: z.string().parse(process.env.REDIS_URL),
};

export function getConfig(configOverride: Partial<Config> = {}): Config {
  return {
    ...config,
    ...configOverride,
  };
}

export function refineMs(value: string): boolean {
  try {
    return Number.isSafeInteger(ms(value));
  } catch {
    return false;
  }
}

export function refineMinMaxInteger(
  valueAsString: string,
  { min, max }: { min: number; max: number }
): boolean {
  const value = Number(valueAsString);

  return Number.isSafeInteger(value) && value >= min && value <= max;
}
