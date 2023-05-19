import "dotenv/config";

import {
  zodStringifiedMs,
  zodStringifiedNumber,
} from "@gjuchault/typescript-service-sdk";
import { z } from "zod";

import { description,version } from "../package.json";

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
  tracingSampling: number;
  redisUrl: string;
}

export const config: Config = {
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

  port: zodStringifiedNumber({
    integer: true,
    min: 10,
    max: 65_536,
  }).parse(process.env.PORT),

  databaseUrl: z.string().parse(process.env.DATABASE_URL),

  databaseMaximumPoolSize: zodStringifiedNumber({
    integer: true,
    min: 0,
    max: 5000,
  }).parse(process.env.DATABASE_MAXIMUM_POOL_SIZE),

  databaseIdleTimeout: zodStringifiedMs().parse(
    process.env.DATABASE_IDLE_TIMEOUT
  ),

  databaseStatementTimeout: zodStringifiedMs().parse(
    process.env.DATABASE_STATEMENT_TIMEOUT
  ),

  redisUrl: z.string().parse(process.env.REDIS_URL),

  tracingSampling: zodStringifiedNumber({
    integer: false,
    min: 0,
    max: 1,
  }).parse(process.env.TRACING_SAMPLING),
};
