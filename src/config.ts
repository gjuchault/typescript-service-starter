import { z } from "zod";

export { version } from "../package.json";

export const name = "app";

export const env = z
  .union([z.literal("development"), z.literal("production"), z.literal("test")])
  .parse(process.env.NODE_ENV);

export const logLevel = z
  .union([
    z.literal("fatal"),
    z.literal("error"),
    z.literal("warn"),
    z.literal("info"),
    z.literal("debug"),
    z.literal("trace"),
  ])
  .parse(process.env.LOG_LEVEL);

export const address = z.string().parse(process.env.ADDRESS);

/**
 * Used for cookie signing
 */
export const secret = z.string().uuid().parse(process.env.SECRET);

export const port = z
  .string()
  .refine((portAsString) => {
    const port = Number(portAsString);

    return port > 0 && port < 65536;
  })
  .transform((portAsString) => Number(portAsString))
  .parse(process.env.PORT);

export const databaseUrl = z.string().parse(process.env.DATABASE_URL);

export const redisUrl = z.string().parse(process.env.REDIS_URL);
