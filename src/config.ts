import "dotenv/config";

import { zodHelpers } from "@gjuchault/typescript-service-sdk";
import { z } from "zod";

import { description, version } from "../package.json";

export interface Config {
  name: string;
  version: string;
  description: string;
  envName: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  address: string;
  secret: string;
  port: number;
  databaseUrl: string;
  databaseMaximumPoolSize: number;
  databaseIdleTimeout: number;
  databaseStatementTimeout: number;
  tracingSampling: number;
  redisUrl: string;
}

export const config: Config = {
  name: "app",
  version,
  description,
  envName: z.string().parse(process.env.ENV_NAME),
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

  port: zodHelpers
    .stringifiedNumber({
      integer: true,
      min: 10,
      max: 65_536,
    })
    .parse(process.env.PORT),

  databaseUrl: z.string().parse(process.env.DATABASE_URL),

  databaseMaximumPoolSize: zodHelpers
    .stringifiedNumber({
      integer: true,
      min: 0,
      max: 5000,
    })
    .parse(process.env.DATABASE_MAXIMUM_POOL_SIZE),

  databaseIdleTimeout: zodHelpers
    .stringifiedMs()
    .parse(process.env.DATABASE_IDLE_TIMEOUT),

  databaseStatementTimeout: zodHelpers
    .stringifiedMs()
    .parse(process.env.DATABASE_STATEMENT_TIMEOUT),

  redisUrl: z.string().parse(process.env.REDIS_URL),

  tracingSampling: zodHelpers
    .stringifiedNumber({
      integer: false,
      min: 0,
      max: 1,
    })
    .parse(process.env.TRACING_SAMPLING),
};
